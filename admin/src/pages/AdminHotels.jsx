import { Card, Table, Tag, Space, Typography, Row, Col, Statistic } from 'antd'
import { useCallback, useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShopOutlined, StarFilled, EnvironmentOutlined } from '@ant-design/icons'
import { GlassButton, TableFilterBar } from '../components'
import { api } from '../services'
import { useTranslation } from 'react-i18next'
import { estimateActionColumnWidth } from '../utils/tableWidth'
import { useRemoteTableQuery } from '../hooks/useRemoteTableQuery'

export default function AdminHotels() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [hotels, setHotels] = useState([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [cityFilter, setCityFilter] = useState('all')
  const [cityOptions, setCityOptions] = useState([{ value: 'all', label: t('adminHotels.filter.allCities') }])
  const {
    searchInput,
    setSearchInput,
    keyword,
    page,
    setPage,
    pageSize,
    total,
    setTotal,
    handlePageChange,
    resetKeyword
  } = useRemoteTableQuery({
    initialPageSize: 10
  })
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    offline: 0
  })

  const fetchCityOptions = useCallback(async () => {
    try {
      const data = await api.get('/api/admin/hotels/cities')
      const cities = Array.isArray(data) ? data : []
      setCityOptions([
        { value: 'all', label: t('adminHotels.filter.allCities') },
        ...cities.map((city) => ({ value: city, label: city }))
      ])
    } catch (error) {
      console.error(error)
      setCityOptions([{ value: 'all', label: t('adminHotels.filter.allCities') }])
    }
  }, [t])

  const fetchHotels = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', String(page))
      params.append('pageSize', String(pageSize))
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)
      if (cityFilter && cityFilter !== 'all') params.append('city', cityFilter)
      if (keyword) params.append('keyword', keyword)

      const data = await api.get(`/api/admin/hotels?${params.toString()}`)
      const list = Array.isArray(data?.list) ? data.list : []
      const nextTotal = Number(data?.total) || 0
      const nextStats = data?.stats

      setHotels(list)
      setTotal(nextTotal)
      if (nextStats && typeof nextStats === 'object') {
        setStats({
          total: Number(nextStats.total) || 0,
          approved: Number(nextStats.approved) || 0,
          pending: Number(nextStats.pending) || 0,
          offline: Number(nextStats.offline) || 0
        })
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [cityFilter, keyword, page, pageSize, setTotal, statusFilter])

  useEffect(() => {
    fetchCityOptions()
  }, [fetchCityOptions])

  useEffect(() => {
    fetchHotels()
  }, [fetchHotels])

  const statusMap = {
    pending: { color: 'orange', label: t('status.pending') },
    approved: { color: 'green', label: t('status.approved') },
    rejected: { color: 'red', label: t('status.rejected') },
    offline: { color: 'default', label: t('status.offline') }
  }

  const actionColumnWidth = useMemo(() => {
    const actionRows = hotels.map((record) => {
      const labels = [t('common.view')]
      if (record.status === 'pending') {
        labels.push(t('common.audit'))
      }
      return labels
    })
    return estimateActionColumnWidth(actionRows, {
      minColumnWidth: 140,
      maxColumnWidth: 320
    })
  }, [hotels, t])

  const columns = [
    { 
      title: t('adminHotels.columns.name'), 
      dataIndex: 'name', 
      ellipsis: true,
      render: (text, record) => (
        <a onClick={() => navigate(`/admin-hotels/${record.id}`)}>{text}</a>
      )
    },
    { title: t('adminHotels.columns.nameEn'), dataIndex: 'name_en', ellipsis: true },
    { 
      title: t('adminHotels.columns.city'), 
      dataIndex: 'city', 
      width: 100,
      render: (v) => v ? <><EnvironmentOutlined /> {v}</> : '-'
    },
    { 
      title: t('adminHotels.columns.star'), 
      dataIndex: 'star_rating', 
      width: 80,
      render: v => v ? <span><StarFilled style={{ color: '#faad14' }} /> {t('adminHotels.starLabel', { value: v })}</span> : '-'
    },
    { 
      title: t('adminHotels.columns.lowestPrice'), 
      dataIndex: 'lowestPrice', 
      width: 100, 
      render: (v) => v ? <span style={{ color: '#f5222d', fontWeight: 600 }}>¥{v}</span> : '-'
    },
    { 
      title: t('adminHotels.columns.roomTypes'), 
      dataIndex: 'roomTypeCount',
      width: 80,
      render: (v, record) => {
        if (Number.isFinite(Number(v))) return Number(v)
        return Array.isArray(record?.roomTypes) ? record.roomTypes.length : 0
      }
    },
    { title: t('adminHotels.columns.openingTime'), dataIndex: 'opening_time', width: 100 },
    {
      title: t('adminHotels.columns.status'),
      dataIndex: 'status',
      width: 90,
      render: (value) => {
        const info = statusMap[value] || { color: 'default', label: value }
        return <Tag color={info.color}>{info.label}</Tag>
      }
    },
    {
      title: t('adminHotels.columns.action'),
      width: actionColumnWidth,
      fixed: 'right',
      render: (_, record) => (
        <Space size={[4, 4]} wrap>
          <GlassButton type="link" size="small" onClick={() => navigate(`/admin-hotels/${record.id}`)}>
            {t('common.view')}
          </GlassButton>
          {record.status === 'pending' && (
            <GlassButton type="link" size="small" onClick={() => navigate(`/audit/${record.id}`)}>
              {t('common.audit')}
            </GlassButton>
          )}
        </Space>
      )
    }
  ]

  const handleStatusChange = (value) => {
    setStatusFilter(value)
    setPage(1)
  }

  const handleCityChange = (value) => {
    setCityFilter(value)
    setPage(1)
  }

  const handleResetFilters = () => {
    resetKeyword()
    setStatusFilter('all')
    setCityFilter('all')
    setPage(1)
  }

  const handleRefresh = async () => {
    await Promise.all([fetchHotels(), fetchCityOptions()])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 24 }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        <ShopOutlined /> {t('adminHotels.title')}
      </Typography.Title>

      {/* 统计卡片 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic title={t('adminHotels.stats.total')} value={stats.total} suffix={t('adminHotels.stats.suffixHotel')} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title={t('adminHotels.stats.approved')} value={stats.approved} styles={{ content: { color: '#52c41a' } }} suffix={t('adminHotels.stats.suffixHotel')} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title={t('adminHotels.stats.pending')} value={stats.pending} styles={{ content: { color: '#faad14' } }} suffix={t('adminHotels.stats.suffixHotel')} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title={t('adminHotels.stats.offline')} value={stats.offline} styles={{ content: { color: '#999' } }} suffix={t('adminHotels.stats.suffixHotel')} />
          </Card>
        </Col>
      </Row>

      {/* 搜索筛选 */}
      <Card>
        <TableFilterBar
          searchPlaceholder={t('adminHotels.filter.searchPlaceholder')}
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          filterItems={[
            {
              key: 'status',
              value: statusFilter,
              onChange: handleStatusChange,
              options: [
                { value: 'all', label: t('adminHotels.filter.allStatus') },
                { value: 'pending', label: t('status.pending') },
                { value: 'approved', label: t('status.approved') },
                { value: 'rejected', label: t('status.rejected') },
                { value: 'offline', label: t('status.offline') }
              ]
            },
            {
              key: 'city',
              value: cityFilter,
              onChange: handleCityChange,
              options: cityOptions
            }
          ]}
          onReset={handleResetFilters}
          onRefresh={handleRefresh}
          refreshLoading={loading}
          resetText={t('adminHotels.filter.reset')}
          refreshText={t('common.refresh')}
        />

        <Table 
          columns={columns} 
          dataSource={hotels} 
          rowKey="id" 
          loading={loading}
          pagination={{ 
            current: page,
            pageSize,
            total,
            showTotal: (total) => t('adminHotels.pagination.total', { total }),
            showSizeChanger: true,
            showQuickJumper: true,
            onChange: handlePageChange
          }}
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  )
}
