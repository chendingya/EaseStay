import { Card, Col, Row, Statistic, Space, Typography, Table, Progress } from 'antd'
import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PercentageOutlined from '@ant-design/icons/es/icons/PercentageOutlined'
import EditOutlined from '@ant-design/icons/es/icons/EditOutlined'
import ShopOutlined from '@ant-design/icons/es/icons/ShopOutlined'
import { GlassButton } from '../components'
import { api } from '../services'
import { useTranslation } from 'react-i18next'

const OVERVIEW_CACHE_KEY = 'dashboard_overview_cache_v1'
const DashboardBatchModals = lazy(() => import('../components/DashboardBatchModals.jsx'))

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

export default function Dashboard() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const role = localStorage.getItem('role')
  const [stats, setStats] = useState({ pending: 0, approved: 0, offline: 0, total: 0 })
  const [loading, setLoading] = useState(false)
  const [hotels, setHotels] = useState([])

  const [batchModalType, setBatchModalType] = useState(null)
  const [overview, setOverview] = useState(() => (role === 'merchant' ? readOverviewCache() : null))
  const [overviewLoading, setOverviewLoading] = useState(false)

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

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const url = role === 'admin' ? '/api/admin/hotels' : '/api/merchant/hotels'
      const data = await api.get(url)
      setHotels(data)
      const counts = data.reduce((acc, item) => {
        acc.total += 1
        if (item.status === 'pending') acc.pending += 1
        if (item.status === 'approved') acc.approved += 1
        if (item.status === 'offline') acc.offline += 1
        return acc
      }, { pending: 0, approved: 0, offline: 0, total: 0 })
      setStats(counts)
    } finally { setLoading(false) }
  }, [role])

  useEffect(() => {
    fetchData()
    if (role === 'merchant') {
      fetchOverview()
    }
  }, [fetchData, fetchOverview, role])

  const currentMonthLabel = t('dashboard.overview.monthlyRevenue', { month: new Date().getMonth() + 1 })
  const overviewStats = overview || {}
  const overviewHotelStats = overviewStats.hotelStats || []
  const overviewTotalRooms = overviewStats.totalRooms || 0
  const overviewRoomTypes = overviewStats.roomTypeCount || 0
  const overviewUsedRooms = overviewStats.usedRooms || 0
  const overviewAvailableRooms = overviewStats.availableRooms || 0
  const overviewOfflineRooms = overviewStats.offlineRooms || 0
  const showOverviewLoading = overviewLoading && !overview

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
              <Statistic title={t('dashboard.stats.pending')} value={stats.pending} loading={loading} styles={{ content: { color: '#faad14' } }} suffix={t('dashboard.overview.hotelCountSuffix')} />
            </Col>
            <Col span={6}>
              <Statistic title={t('dashboard.stats.approved')} value={stats.approved} loading={loading} styles={{ content: { color: '#52c41a' } }} suffix={t('dashboard.overview.hotelCountSuffix')} />
            </Col>
            <Col span={6}>
              <Statistic title={t('dashboard.stats.offline')} value={stats.offline} loading={loading} styles={{ content: { color: '#999' } }} suffix={t('dashboard.overview.hotelCountSuffix')} />
            </Col>
          </Row>
        </Card>
      )}
      {/* 统计卡片 */}
      {role !== 'merchant' && (
        <Row gutter={16}>
          <Col span={6}>
            <Card><Statistic title={t('dashboard.stats.pending')} value={stats.pending} loading={loading} styles={{ content: { color: '#faad14' } }} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title={t('dashboard.stats.approved')} value={stats.approved} loading={loading} styles={{ content: { color: '#52c41a' } }} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title={t('dashboard.stats.offline')} value={stats.offline} loading={loading} styles={{ content: { color: '#999' } }} /></Card>
          </Col>
          {role === 'admin' && (
            <Col span={6}>
              <Card><Statistic title={t('dashboard.stats.total')} value={stats.total} loading={loading} /></Card>
            </Col>
          )}
        </Row>
      )}

      {role === 'merchant' && (
        <Card title={t('dashboard.distribution.title')} loading={showOverviewLoading}>
          <Table
            columns={[
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
            ]}
            dataSource={overviewHotelStats}
            rowKey="hotelId"
            pagination={{ pageSize: 6 }}
            size="small"
          />
        </Card>
      )}

      {/* 快捷操作 */}
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
          <GlassButton icon={<PercentageOutlined />} onClick={() => setBatchModalType('discount')}>
            {t('dashboard.quickActions.batchDiscount')}
          </GlassButton>
          <GlassButton icon={<EditOutlined />} onClick={() => setBatchModalType('room')}>
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
            onClose={() => setBatchModalType(null)}
          />
        </Suspense>
      )}

    </div>
  )
}
