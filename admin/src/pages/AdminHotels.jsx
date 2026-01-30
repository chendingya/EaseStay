import { Card, Table, Tag, Space, Typography, Input, Select, Row, Col, Statistic } from 'antd'
import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchOutlined, ShopOutlined, StarFilled, EnvironmentOutlined } from '@ant-design/icons'
import { GlassButton, glassMessage as message } from '../components/GlassUI'

const apiBase = 'http://127.0.0.1:4100'

const statusMap = {
  pending: { color: 'orange', label: '待审核' },
  approved: { color: 'green', label: '已上架' },
  rejected: { color: 'red', label: '已驳回' },
  offline: { color: 'default', label: '已下线' }
}

export default function AdminHotels() {
  const navigate = useNavigate()
  const [hotels, setHotels] = useState([])
  const [loading, setLoading] = useState(false)
  
  // 搜索筛选
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [cityFilter, setCityFilter] = useState('all')

  const fetchHotels = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    setLoading(true)
    try {
      const response = await fetch(`${apiBase}/api/admin/hotels`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      if (!response.ok) {
        message.error(data.message || '获取酒店列表失败')
        return
      }
      setHotels(data)
    } catch {
      message.error('获取酒店列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHotels()
  }, [])

  // 获取城市列表
  const cityOptions = useMemo(() => {
    const cities = [...new Set(hotels.map(h => h.city).filter(Boolean))]
    return [{ value: 'all', label: '全部城市' }, ...cities.map(c => ({ value: c, label: c }))]
  }, [hotels])

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

  const columns = [
    { 
      title: '酒店名称', 
      dataIndex: 'name', 
      ellipsis: true,
      render: (text, record) => (
        <a onClick={() => navigate(`/admin-hotels/${record.id}`)}>{text}</a>
      )
    },
    { title: '英文名', dataIndex: 'name_en', ellipsis: true },
    { 
      title: '城市', 
      dataIndex: 'city', 
      width: 100,
      render: (v) => v ? <><EnvironmentOutlined /> {v}</> : '-'
    },
    { 
      title: '星级', 
      dataIndex: 'star_rating', 
      width: 80,
      render: v => v ? <span><StarFilled style={{ color: '#faad14' }} /> {v}星</span> : '-'
    },
    { 
      title: '最低价', 
      dataIndex: 'lowestPrice', 
      width: 100, 
      render: (v) => v ? <span style={{ color: '#f5222d', fontWeight: 600 }}>¥{v}</span> : '-'
    },
    { 
      title: '房型数', 
      dataIndex: 'roomTypes',
      width: 80,
      render: (v) => Array.isArray(v) ? v.length : 0
    },
    { title: '开业时间', dataIndex: 'opening_time', width: 100 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value) => {
        const info = statusMap[value] || { color: 'default', label: value }
        return <Tag color={info.color}>{info.label}</Tag>
      }
    },
    {
      title: '操作',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <GlassButton type="link" size="small" onClick={() => navigate(`/admin-hotels/${record.id}`)}>
            查看
          </GlassButton>
          {record.status === 'pending' && (
            <GlassButton type="link" size="small" onClick={() => navigate(`/audit/${record.id}`)}>
              审核
            </GlassButton>
          )}
        </Space>
      )
    }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 24 }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        <ShopOutlined /> 酒店管理
      </Typography.Title>

      {/* 统计卡片 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic title="酒店总数" value={stats.total} suffix="家" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="已上架" value={stats.approved} valueStyle={{ color: '#52c41a' }} suffix="家" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="待审核" value={stats.pending} valueStyle={{ color: '#faad14' }} suffix="家" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="已下线" value={stats.offline} valueStyle={{ color: '#999' }} suffix="家" />
          </Card>
        </Col>
      </Row>

      {/* 搜索筛选 */}
      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Input
              placeholder="搜索酒店名称、地址..."
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
                { value: 'all', label: '全部状态' },
                { value: 'pending', label: '待审核' },
                { value: 'approved', label: '已上架' },
                { value: 'rejected', label: '已驳回' },
                { value: 'offline', label: '已下线' }
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
                重置筛选
              </GlassButton>
              <GlassButton type="primary" onClick={fetchHotels} loading={loading}>
                刷新
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
            showTotal: (total) => `共 ${total} 家酒店`,
            showSizeChanger: true,
            showQuickJumper: true
          }}
        />
      </Card>
    </div>
  )
}
