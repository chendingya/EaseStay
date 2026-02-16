import { Card, Table, Tag, Space, Typography, Input, Select, Row, Col, Statistic } from 'antd'
import { useCallback, useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchOutlined, ShopOutlined, StarFilled, EnvironmentOutlined } from '@ant-design/icons'
import { GlassButton } from '../components'
import { api } from '../services'
import { useTranslation } from 'react-i18next'

export default function AdminHotels() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [hotels, setHotels] = useState([])
  const [loading, setLoading] = useState(false)
  
  // 搜索筛选
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [cityFilter, setCityFilter] = useState('all')

  const fetchHotels = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get('/api/admin/hotels')
      setHotels(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHotels()
  }, [fetchHotels])

  // 获取城市列表
  const cityOptions = useMemo(() => {
    const cities = [...new Set(hotels.map(h => h.city).filter(Boolean))]
    return [{ value: 'all', label: t('adminHotels.filter.allCities') }, ...cities.map(c => ({ value: c, label: c }))]
  }, [hotels, t])

  // 筛选后的数据
  const filteredHotels = useMemo(() => {
    return hotels.filter(hotel => {
      const matchSearch = !searchText || 
        hotel.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        hotel.name_en?.toLowerCase().includes(searchText.toLowerCase()) ||
        hotel.address?.toLowerCase().includes(searchText.toLowerCase())
      const matchStatus = statusFilter === 'all' || hotel.status === statusFilter
      const matchCity = cityFilter === 'all' || hotel.city === cityFilter
      return matchSearch && matchStatus && matchCity
    })
  }, [hotels, searchText, statusFilter, cityFilter])

  // 统计数据
  const stats = useMemo(() => ({
    total: hotels.length,
    approved: hotels.filter(h => h.status === 'approved').length,
    pending: hotels.filter(h => h.status === 'pending').length,
    offline: hotels.filter(h => h.status === 'offline').length
  }), [hotels])

  const statusMap = {
    pending: { color: 'orange', label: t('status.pending') },
    approved: { color: 'green', label: t('status.approved') },
    rejected: { color: 'red', label: t('status.rejected') },
    offline: { color: 'default', label: t('status.offline') }
  }

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
      dataIndex: 'roomTypes',
      width: 80,
      render: (v) => Array.isArray(v) ? v.length : 0
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
      width: 150,
      render: (_, record) => (
        <Space size="small">
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
            <Statistic title={t('adminHotels.stats.approved')} value={stats.approved} valueStyle={{ color: '#52c41a' }} suffix={t('adminHotels.stats.suffixHotel')} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title={t('adminHotels.stats.pending')} value={stats.pending} valueStyle={{ color: '#faad14' }} suffix={t('adminHotels.stats.suffixHotel')} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title={t('adminHotels.stats.offline')} value={stats.offline} valueStyle={{ color: '#999' }} suffix={t('adminHotels.stats.suffixHotel')} />
          </Card>
        </Col>
      </Row>

      {/* 搜索筛选 */}
      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Input
              placeholder={t('adminHotels.filter.searchPlaceholder')}
              prefix={<SearchOutlined style={{ color: '#bbb' }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col span={4}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: t('adminHotels.filter.allStatus') },
                { value: 'pending', label: t('status.pending') },
                { value: 'approved', label: t('status.approved') },
                { value: 'rejected', label: t('status.rejected') },
                { value: 'offline', label: t('status.offline') }
              ]}
            />
          </Col>
          <Col span={4}>
            <Select
              style={{ width: '100%' }}
              value={cityFilter}
              onChange={setCityFilter}
              options={cityOptions}
            />
          </Col>
          <Col span={8} style={{ textAlign: 'right' }}>
            <Space>
              <GlassButton onClick={() => { setSearchText(''); setStatusFilter('all'); setCityFilter('all') }}>
                {t('adminHotels.filter.reset')}
              </GlassButton>
              <GlassButton type="primary" onClick={fetchHotels} loading={loading}>
                {t('common.refresh')}
              </GlassButton>
            </Space>
          </Col>
        </Row>

        <Table 
          columns={columns} 
          dataSource={filteredHotels} 
          rowKey="id" 
          loading={loading}
          pagination={{ 
            pageSize: 10,
            showTotal: (total) => t('adminHotels.pagination.total', { total }),
            showSizeChanger: true,
            showQuickJumper: true
          }}
        />
      </Card>
    </div>
  )
}
