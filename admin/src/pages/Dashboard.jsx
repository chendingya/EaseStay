import { Card, Col, Progress, Row, Space, Statistic, Table, Typography } from 'antd'
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PercentageOutlined from '@ant-design/icons/es/icons/PercentageOutlined'
import EditOutlined from '@ant-design/icons/es/icons/EditOutlined'
import ShopOutlined from '@ant-design/icons/es/icons/ShopOutlined'
import { GlassButton, TableFilterBar } from '../components'
import { api } from '../services'
import { useTranslation } from 'react-i18next'
import { useSessionStore } from '../stores'

const OVERVIEW_CACHE_KEY = 'dashboard_overview_cache_v1'
const DashboardBatchModals = lazy(() => import('../components/DashboardBatchModals.jsx'))

const toList = (data) => (Array.isArray(data?.list) ? data.list : (Array.isArray(data) ? data : []))

const toTotal = (data) => {
  if (Array.isArray(data?.list)) return Number(data?.total) || 0
  const list = toList(data)
  return list.length
}

const readOverviewCache = () => {
  try {
    const raw = localStorage.getItem(OVERVIEW_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

const writeOverviewCache = (value) => {
  try {
    localStorage.setItem(OVERVIEW_CACHE_KEY, JSON.stringify(value))
  } catch {
    // ignore storage write failures (quota/private mode)
  }
}

async function fetchAllHotels(basePath) {
  const pageSize = 200
  let page = 1
  let total = Number.POSITIVE_INFINITY
  const merged = []

  while (merged.length < total) {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize)
    })
    const data = await api.get(`${basePath}?${params.toString()}`)
    const list = toList(data)
    if (!list.length) break
    merged.push(...list)

    if (Array.isArray(data?.list)) {
      total = Number(data?.total) || merged.length
      page += 1
      if (page > 100) break
      continue
    }

    break
  }

  return merged
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const role = useSessionStore((state) => state.role)
  const [stats, setStats] = useState({ pending: 0, approved: 0, offline: 0, total: 0 })
  const [statsLoading, setStatsLoading] = useState(false)
  const [hotels, setHotels] = useState([])
  const [hotelsLoading, setHotelsLoading] = useState(false)
  const [hotelsReady, setHotelsReady] = useState(false)

  const [batchModalType, setBatchModalType] = useState(null)
  const [overview, setOverview] = useState(() => (role === 'merchant' ? readOverviewCache() : null))
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [distributionSearch, setDistributionSearch] = useState('')
  const [distributionStatus, setDistributionStatus] = useState('all')

  const fetchOverview = useCallback(async () => {
    if (role !== 'merchant') return
    setOverviewLoading(true)
    try {
      const data = await api.get('/api/merchant/hotels/overview')
      setOverview(data)
      writeOverviewCache(data)
    } catch (error) {
      console.error(error)
    } finally {
      setOverviewLoading(false)
    }
  }, [role])

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      if (role === 'admin') {
        const data = await api.get('/api/admin/hotels?page=1&pageSize=1')
        if (data?.stats && typeof data.stats === 'object') {
          setStats({
            pending: Number(data.stats.pending) || 0,
            approved: Number(data.stats.approved) || 0,
            offline: Number(data.stats.offline) || 0,
            total: Number(data.stats.total) || 0
          })
          return
        }
        const list = toList(data)
        setStats(list.reduce((acc, item) => {
          acc.total += 1
          if (item.status === 'pending') acc.pending += 1
          if (item.status === 'approved') acc.approved += 1
          if (item.status === 'offline') acc.offline += 1
          return acc
        }, { pending: 0, approved: 0, offline: 0, total: 0 }))
        return
      }

      const fetchMerchantCount = async (status) => {
        const params = new URLSearchParams({
          page: '1',
          pageSize: '1'
        })
        if (status) params.append('status', status)
        const data = await api.get(`/api/merchant/hotels?${params.toString()}`)
        return toTotal(data)
      }

      const [total, pending, approved, offline] = await Promise.all([
        fetchMerchantCount(),
        fetchMerchantCount('pending'),
        fetchMerchantCount('approved'),
        fetchMerchantCount('offline')
      ])

      setStats({ total, pending, approved, offline })
    } catch (error) {
      console.error(error)
    } finally {
      setStatsLoading(false)
    }
  }, [role])

  const ensureHotelsLoaded = useCallback(async () => {
    if (hotelsReady || hotelsLoading) return
    setHotelsLoading(true)
    try {
      const basePath = role === 'admin' ? '/api/admin/hotels' : '/api/merchant/hotels'
      const allHotels = await fetchAllHotels(basePath)
      setHotels(allHotels)
      setHotelsReady(true)
    } catch (error) {
      console.error(error)
      setHotels([])
    } finally {
      setHotelsLoading(false)
    }
  }, [hotelsLoading, hotelsReady, role])

  useEffect(() => {
    fetchStats()

    if (role !== 'merchant') return
    let canceled = false
    const run = async () => {
      if (!canceled) {
        await fetchOverview()
      }
    }

    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(run, { timeout: 1200 })
      return () => {
        canceled = true
        if (typeof window.cancelIdleCallback === 'function') {
          window.cancelIdleCallback(idleId)
        }
      }
    }

    const timer = setTimeout(run, 250)
    return () => {
      canceled = true
      clearTimeout(timer)
    }
  }, [fetchOverview, fetchStats, role])

  const openBatchModal = (type) => {
    setBatchModalType(type)
    ensureHotelsLoaded().catch((error) => {
      console.error(error)
    })
  }

  const currentMonthLabel = t('dashboard.overview.monthlyRevenue', { month: new Date().getMonth() + 1 })
  const overviewStats = overview || {}
  const overviewHotelStats = overviewStats.hotelStats || []
  const overviewTotalRooms = overviewStats.totalRooms || 0
  const overviewRoomTypes = overviewStats.roomTypeCount || 0
  const overviewUsedRooms = overviewStats.usedRooms || 0
  const overviewAvailableRooms = overviewStats.availableRooms || 0
  const overviewOfflineRooms = overviewStats.offlineRooms || 0
  const showOverviewLoading = overviewLoading && !overview

  const overviewColumns = useMemo(
    () => [
      { title: t('dashboard.distribution.columns.hotel'), dataIndex: 'name', key: 'name' },
      { title: t('dashboard.distribution.columns.roomTypes'), dataIndex: 'roomTypeCount', key: 'roomTypeCount', width: 90 },
      { title: t('dashboard.distribution.columns.totalRooms'), dataIndex: 'totalRooms', key: 'totalRooms', width: 90 },
      { title: t('dashboard.distribution.columns.usedRooms'), dataIndex: 'usedRooms', key: 'usedRooms', width: 80 },
      { title: t('dashboard.distribution.columns.availableRooms'), dataIndex: 'availableRooms', key: 'availableRooms', width: 80 },
      {
        title: t('dashboard.distribution.columns.occupancy'),
        dataIndex: 'occupancyRate',
        key: 'occupancyRate',
        width: 160,
        render: (value) => <Progress percent={value || 0} size="small" />
      }
    ],
    [t]
  )

  const filteredOverviewHotelStats = useMemo(() => {
    const keyword = distributionSearch.trim().toLowerCase()
    return overviewHotelStats.filter((item) => {
      const matchKeyword = !keyword || String(item?.name || '').toLowerCase().includes(keyword)
      const matchStatus = distributionStatus === 'all' || item?.status === distributionStatus
      return matchKeyword && matchStatus
    })
  }, [distributionSearch, distributionStatus, overviewHotelStats])

  const handleResetDistributionFilters = () => {
    setDistributionSearch('')
    setDistributionStatus('all')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 24 }}>
      {role === 'merchant' && (
        <Card title={t('dashboard.overview.title')}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic title={t('dashboard.overview.totalRoomsTitle')} value={overviewTotalRooms} suffix={t('dashboard.overview.totalRoomsSuffix')} loading={showOverviewLoading} />
            </Col>
            <Col span={6}>
              <Statistic title={t('dashboard.overview.roomTypesTitle')} value={overviewRoomTypes} suffix={t('dashboard.overview.roomTypesSuffix')} loading={showOverviewLoading} />
            </Col>
            <Col span={6}>
              <Statistic title={currentMonthLabel} value={overviewStats.monthlyRevenue || 0} prefix="¥" loading={showOverviewLoading} />
            </Col>
            <Col span={6}>
              <Statistic title={t('dashboard.overview.hotelCountTitle')} value={overviewStats.totalHotels || 0} suffix={t('dashboard.overview.hotelCountSuffix')} loading={showOverviewLoading} />
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={8}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 12, borderRadius: 8, background: '#fafafa' }}>
                <Progress type="dashboard" percent={overviewStats.occupancyRate || 0} strokeColor="#faad14" size={84} />
                <div>
                  <Statistic title={t('dashboard.overview.occupancyRateTitle')} value={overviewStats.occupancyRate || 0} suffix="%" loading={showOverviewLoading} />
                  <Typography.Text type="secondary">{t('dashboard.overview.usedRoomsText', { count: overviewUsedRooms })}</Typography.Text>
                </div>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 12, borderRadius: 8, background: '#fafafa' }}>
                <Progress type="dashboard" percent={overviewStats.availableRate || 0} strokeColor="#52c41a" size={84} />
                <div>
                  <Statistic title={t('dashboard.overview.availableRateTitle')} value={overviewStats.availableRate || 0} suffix="%" loading={showOverviewLoading} />
                  <Typography.Text type="secondary">{t('dashboard.overview.availableRoomsText', { count: overviewAvailableRooms })}</Typography.Text>
                </div>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 12, borderRadius: 8, background: '#fafafa' }}>
                <Progress type="dashboard" percent={overviewStats.offlineRate || 0} strokeColor="#999" size={84} />
                <div>
                  <Statistic title={t('dashboard.overview.offlineRateTitle')} value={overviewStats.offlineRate || 0} suffix="%" loading={showOverviewLoading} />
                  <Typography.Text type="secondary">{t('dashboard.overview.offlineRoomsText', { count: overviewOfflineRooms })}</Typography.Text>
                </div>
              </div>
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={6}>
              <Statistic title={t('dashboard.stats.pending')} value={stats.pending} loading={statsLoading} styles={{ content: { color: '#faad14' } }} suffix={t('dashboard.overview.hotelCountSuffix')} />
            </Col>
            <Col span={6}>
              <Statistic title={t('dashboard.stats.approved')} value={stats.approved} loading={statsLoading} styles={{ content: { color: '#52c41a' } }} suffix={t('dashboard.overview.hotelCountSuffix')} />
            </Col>
            <Col span={6}>
              <Statistic title={t('dashboard.stats.offline')} value={stats.offline} loading={statsLoading} styles={{ content: { color: '#999' } }} suffix={t('dashboard.overview.hotelCountSuffix')} />
            </Col>
          </Row>
        </Card>
      )}

      {role !== 'merchant' && (
        <Row gutter={16}>
          <Col span={6}>
            <Card><Statistic title={t('dashboard.stats.pending')} value={stats.pending} loading={statsLoading} styles={{ content: { color: '#faad14' } }} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title={t('dashboard.stats.approved')} value={stats.approved} loading={statsLoading} styles={{ content: { color: '#52c41a' } }} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title={t('dashboard.stats.offline')} value={stats.offline} loading={statsLoading} styles={{ content: { color: '#999' } }} /></Card>
          </Col>
          {role === 'admin' && (
            <Col span={6}>
              <Card><Statistic title={t('dashboard.stats.total')} value={stats.total} loading={statsLoading} /></Card>
            </Col>
          )}
        </Row>
      )}

      {role === 'merchant' && (
        <Card title={t('dashboard.distribution.title')} loading={showOverviewLoading}>
          <TableFilterBar
            searchPlaceholder={t('dashboard.distribution.filterSearchPlaceholder')}
            searchValue={distributionSearch}
            onSearchChange={setDistributionSearch}
            filterItems={[
              {
                key: 'distribution-status',
                value: distributionStatus,
                onChange: setDistributionStatus,
                options: [
                  { value: 'all', label: t('dashboard.distribution.filterAllStatus') },
                  { value: 'pending', label: t('status.pending') },
                  { value: 'approved', label: t('status.approved') },
                  { value: 'rejected', label: t('status.rejected') },
                  { value: 'offline', label: t('status.offline') }
                ]
              }
            ]}
            summaryNode={<Typography.Text type="secondary">{t('dashboard.distribution.filteredCount', { count: filteredOverviewHotelStats.length })}</Typography.Text>}
            onReset={handleResetDistributionFilters}
            onRefresh={fetchOverview}
            refreshLoading={overviewLoading}
            resetText={t('common.reset')}
            refreshText={t('common.refresh')}
          />
          <Table
            columns={overviewColumns}
            dataSource={filteredOverviewHotelStats}
            rowKey="hotelId"
            pagination={{ pageSize: 6 }}
            size="small"
          />
        </Card>
      )}

      <Card title={t('dashboard.quickActions.title')}>
        <Space wrap size={12}>
          {role === 'merchant' && (
            <GlassButton type="primary" icon={<ShopOutlined />} onClick={() => navigate('/hotels/new')}>
              {t('dashboard.quickActions.newHotel')}
            </GlassButton>
          )}
          {role === 'admin' && (
            <GlassButton type="primary" onClick={() => navigate('/audit')}>
              {t('dashboard.quickActions.pendingAudit')}
            </GlassButton>
          )}
          <GlassButton icon={<PercentageOutlined />} onClick={() => openBatchModal('discount')}>
            {t('dashboard.quickActions.batchDiscount')}
          </GlassButton>
          <GlassButton icon={<EditOutlined />} onClick={() => openBatchModal('room')}>
            {t('dashboard.quickActions.batchRoom')}
          </GlassButton>
        </Space>
      </Card>

      {batchModalType && (
        <Suspense fallback={null}>
          <DashboardBatchModals
            mode={batchModalType}
            role={role}
            hotels={hotels}
            hotelsLoading={hotelsLoading}
            onClose={() => setBatchModalType(null)}
          />
        </Suspense>
      )}
    </div>
  )
}
