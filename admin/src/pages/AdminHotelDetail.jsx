import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Tag, Image, Space, Typography, Table, Spin, Row, Col, Modal, Input, Tabs, Progress, Statistic } from 'antd'
import { StarFilled, EnvironmentOutlined, CalendarOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { GlassButton, glassMessage as message } from '../components'
import dayjs from 'dayjs'
import { api } from '../services/request'

const statusMap = {
  pending: { color: 'orange', label: '待审核' },
  approved: { color: 'green', label: '已上架' },
  rejected: { color: 'red', label: '已驳回' },
  offline: { color: 'default', label: '已下线' }
}

export default function AdminHotelDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [hotel, setHotel] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Stats state
  const [overview, setOverview] = useState(null)
  const [orders, setOrders] = useState([])
  const [ordersTotal, setOrdersTotal] = useState(0)
  const [ordersPage, setOrdersPage] = useState(1)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [orderStats, setOrderStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)

  const fetchHotel = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get(`/api/admin/hotels/${id}`)
      setHotel(data)
    } catch (error) {
      if (error?.response?.status) {
        navigate('/admin-hotels')
      }
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  const fetchOverview = useCallback(async () => {
    try {
      const data = await api.get(`/api/admin/hotels/${id}/overview`)
      setOverview(data)
    } catch (error) {
      console.error('获取酒店概览失败:', error)
      setOverview(null)
    }
  }, [id])

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true)
    try {
      const params = new URLSearchParams({ page: ordersPage, pageSize: 8 })
      const data = await api.get(`/api/admin/hotels/${id}/orders?${params.toString()}`)
      setOrders(data.list || [])
      setOrdersTotal(data.total || 0)
    } catch (error) {
      console.error('获取订单列表失败:', error)
    } finally {
      setOrdersLoading(false)
    }
  }, [id, ordersPage])

  const fetchOrderStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const data = await api.get(`/api/admin/hotels/${id}/order-stats`)
      setOrderStats(data)
    } catch (error) {
      console.error('获取订单统计失败:', error)
    } finally {
      setStatsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchHotel()
    fetchOverview()
    fetchOrderStats()
  }, [fetchHotel, fetchOverview, fetchOrderStats])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleRefresh = async () => {
    await Promise.all([
      fetchHotel(),
      fetchOverview(),
      fetchOrders(),
      fetchOrderStats()
    ])
    message.success('已刷新')
  }

  // 下架酒店
  const handleOffline = () => {
    let reason = ''
    Modal.confirm({
      title: '确认下架该酒店？',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div style={{ marginTop: 16 }}>
          <Typography.Text>请输入下架原因：</Typography.Text>
          <Input.TextArea 
            rows={3} 
            placeholder="请输入下架原因，商户将收到通知" 
            onChange={(e) => { reason = e.target.value }}
            style={{ marginTop: 8 }}
          />
        </div>
      ),
      okText: '确认下架',
      okButtonProps: { danger: true },
      cancelText: '取消',
      async onOk() {
        if (!reason.trim()) {
          message.warning('请输入下架原因')
          return Promise.reject()
        }
        try {
          await api.put(`/api/admin/hotels/${id}/offline`, { reason })
          message.success('酒店已下架')
          fetchHotel()
        } catch (error) {
          console.error('下架酒店失败:', error)
          message.error('下架失败，请重试')
        }
      }
    })
  }

  // 恢复上架
  const handleRestore = async () => {
    Modal.confirm({
      title: '确认恢复上架该酒店？',
      icon: <ExclamationCircleOutlined />,
      content: '恢复上架后，酒店将重新在列表中展示',
      okText: '确认恢复',
      cancelText: '取消',
      async onOk() {
        try {
          await api.put(`/api/admin/hotels/${id}/restore`)
          message.success('酒店已恢复上架')
          fetchHotel()
        } catch (error) {
          console.error('恢复上架失败:', error)
          message.error('恢复上架失败，请重试')
        }
      }
    })
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!hotel) {
    return null
  }

  const statusInfo = statusMap[hotel.status] || { color: 'default', label: hotel.status }
  const promotionList = (hotel.promotions || []).filter((promo) => promo && promo.title)
  const formatPeriodLabel = (periods) => {
    const list = Array.isArray(periods) ? periods : []
    if (!list.length) return '长期'
    return list.map((p) => `${dayjs(p.start).format('YYYY-MM-DD HH:mm')}~${dayjs(p.end).format('YYYY-MM-DD HH:mm')}`).join('，')
  }
  const isPeriodEffective = (periods) => {
    const list = Array.isArray(periods) ? periods : []
    if (!list.length) return true
    const now = dayjs()
    return list.some((p) => now.isAfter(dayjs(p.start)) && now.isBefore(dayjs(p.end)))
  }

  // Columns definitions
  const roomColumns = [
    { title: '房型名称', dataIndex: 'name', key: 'name' },
    { title: '可住', dataIndex: 'capacity', key: 'capacity', width: 80, render: (v) => v ? `${v}人` : '-' },
    { title: '床宽', dataIndex: 'bed_width', key: 'bed_width', width: 80, render: (v) => v ? `${v}cm` : '-' },
    { title: '面积', dataIndex: 'area', key: 'area', width: 80, render: (v) => v ? `${v}㎡` : '-' },
    { title: '层高', dataIndex: 'ceiling_height', key: 'ceiling_height', width: 80, render: (v) => v ? `${v}m` : '-' },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      render: (price, record) => {
        const basePrice = Number(price) || 0
        const discountRate = Number(record.discount_rate) || 0
        const discountQuota = Number(record.discount_quota) || 0
        const discountEffective = discountQuota > 0 && ((discountRate > 0 && discountRate <= 10) || discountRate < 0) && isPeriodEffective(record.discount_periods)
        const now = dayjs()
        const effectivePromos = promotionList.filter(p => {
          const periods = Array.isArray(p.periods) ? p.periods : []
          if (!periods.length) return true
          return periods.some(r => now.isAfter(dayjs(r.start)) && now.isBefore(dayjs(r.end)))
        })
        let discounted = basePrice
        effectivePromos.forEach(p => {
          const val = Number(p.value) || 0
          if (val > 0 && val <= 10) {
            discounted = discounted * (val / 10)
          } else if (val < 0) {
            discounted = Math.max(0, discounted + val)
          }
        })
        if (discountEffective) {
          if (discountRate > 0 && discountRate <= 10) {
            discounted = discounted * (discountRate / 10)
          } else if (discountRate < 0) {
            discounted = Math.max(0, discounted + discountRate)
          }
        }
        discounted = Math.round(discounted * 100) / 100
        return (
          <div>
            <div style={{ color: '#999' }}>基础价 ¥{basePrice}</div>
            <div style={{ color: '#f5222d', fontWeight: 600 }}>当前售价 ¥{discounted}</div>
          </div>
        )
      }
    },
    {
      title: '优惠',
      key: 'discount',
      render: (_, record) => {
        const tags = []
        const discountRate = Number(record.discount_rate) || 0
        const discountQuota = Number(record.discount_quota) || 0
        if (discountQuota > 0 && ((discountRate > 0 && discountRate <= 10) || discountRate < 0)) {
          tags.push(
            <Tag color="purple" key={`batch-${record.id || record.name}`}>
              {discountRate > 0 ? `批量折扣 ${discountRate}折 余${discountQuota} 有效期 ${formatPeriodLabel(record.discount_periods)}` : `立减 ${Math.abs(discountRate)}元 余${discountQuota} 有效期 ${formatPeriodLabel(record.discount_periods)}`}
            </Tag>
          )
        }
        const now = dayjs()
        const effectivePromos = promotionList.filter(p => {
          const periods = Array.isArray(p.periods) ? p.periods : []
          if (!periods.length) return true
          return periods.some(r => now.isAfter(dayjs(r.start)) && now.isBefore(dayjs(r.end)))
        })
        effectivePromos.forEach((promo, index) => {
          tags.push(
            <Tag color="blue" key={`promo-${record.id || record.name}-${index}`}>
              {promo.title || promo.type || '优惠'}
            </Tag>
          )
        })
        return tags.length ? <Space size={[4, 4]} wrap>{tags}</Space> : <Tag>无优惠</Tag>
      }
    },
    { title: '库存', dataIndex: 'stock', key: 'stock' },
    { title: 'WiFi', dataIndex: 'wifi', key: 'wifi', width: 70, render: (v) => v === true ? '有' : v === false ? '无' : '-' },
    { title: '含早', dataIndex: 'breakfast_included', key: 'breakfast_included', width: 70, render: (v) => v === true ? '是' : v === false ? '否' : '-' },
    {
      title: '已用',
      dataIndex: 'used_stock',
      key: 'used_stock',
      render: (value) => value || 0
    },
    {
      title: '空闲',
      key: 'available',
      render: (_, record) => {
        const stock = Number(record.stock) || 0
        const used = Number(record.used_stock) || 0
        const offline = Number(record.offline_stock) || 0
        return Math.max(stock - used - offline, 0)
      }
    }
  ]

  const orderColumns = [
    { title: '订单号', dataIndex: 'id', key: 'id', width: 90 },
    { title: '房型', dataIndex: 'room_type_name', key: 'room_type_name' },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 70 },
    {
      title: '单价',
      dataIndex: 'price_per_night',
      key: 'price_per_night',
      render: (price) => <span style={{ color: '#f5222d' }}>¥{price}</span>
    },
    { title: '间夜', dataIndex: 'nights', key: 'nights', width: 70 },
    {
      title: '总价',
      dataIndex: 'total_price',
      key: 'total_price',
      render: (price) => <span style={{ color: '#f5222d', fontWeight: 600 }}>¥{price}</span>
    },
    { title: '状态', dataIndex: 'status', key: 'status', width: 90 },
    {
      title: '入住',
      dataIndex: 'check_in',
      key: 'check_in',
      render: (value) => value || '-'
    },
    {
      title: '下单时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (value) => value ? new Date(value).toLocaleString() : '-'
    }
  ]

  // Computed stats
  const computedOverview = overview || (() => {
    const totals = (hotel.roomTypes || []).reduce(
      (acc, room) => {
        const stock = Number(room.stock) || 0
        const used = Number(room.used_stock) || 0
        const offline = Number(room.offline_stock) || 0
        const available = Math.max(stock - used - offline, 0)
        acc.total += stock
        acc.used += used
        acc.offline += offline
        acc.available += available
        return acc
      },
      { total: 0, used: 0, available: 0, offline: 0 }
    )
    return totals
  })()
  const overviewTotal = computedOverview.total || 0
  const usedPercent = overviewTotal ? Math.round((computedOverview.used / overviewTotal) * 100) : 0
  const availablePercent = overviewTotal ? Math.round((computedOverview.available / overviewTotal) * 100) : 0
  const offlinePercent = overviewTotal ? Math.round((computedOverview.offline / overviewTotal) * 100) : 0
  
  const roomTypeSummary = orderStats?.roomTypeSummary || []
  const roomTypeDaily = orderStats?.roomTypeDaily || []
  const roomTypeMonthly = orderStats?.roomTypeMonthly || []
  const totalRoomNights = roomTypeSummary.reduce((sum, item) => sum + (Number(item.nights) || 0), 0)

  const roomTypeSummaryColumns = [
    { title: '房型', dataIndex: 'roomTypeName', key: 'roomTypeName' },
    { title: '入住间夜', dataIndex: 'nights', key: 'nights', width: 90 },
    {
      title: '入住率',
      dataIndex: 'occupancyRate',
      key: 'occupancyRate',
      width: 90,
      render: (value) => `${value || 0}%`
    },
    {
      title: '收入',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (value) => `¥${value || 0}`
    }
  ]

  const roomTypeDailyColumns = [
    { title: '日期', dataIndex: 'date', key: 'date', width: 120 },
    { title: '房型', dataIndex: 'roomTypeName', key: 'roomTypeName' },
    { title: '入住间夜', dataIndex: 'nights', key: 'nights', width: 90 },
    {
      title: '入住率',
      dataIndex: 'occupancyRate',
      key: 'occupancyRate',
      width: 90,
      render: (value) => `${value || 0}%`
    },
    {
      title: '订单金额',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (value) => `¥${value || 0}`
    }
  ]

  const roomTypeMonthlyColumns = [
    { title: '月份', dataIndex: 'month', key: 'month', width: 120 },
    { title: '房型', dataIndex: 'roomTypeName', key: 'roomTypeName' },
    { title: '入住间夜', dataIndex: 'nights', key: 'nights', width: 90 },
    {
      title: '入住率',
      dataIndex: 'occupancyRate',
      key: 'occupancyRate',
      width: 90,
      render: (value) => `${value || 0}%`
    },
    {
      title: '订单金额',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (value) => `¥${value || 0}`
    }
  ]

  return (
    <>
      {/* 页面标题和操作按钮 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {hotel.name}
            <Tag color={statusInfo.color} style={{ marginLeft: 12, verticalAlign: 'middle' }}>
              {statusInfo.label}
            </Tag>
          </Typography.Title>
          {hotel.name_en && (
            <Typography.Text type="secondary">{hotel.name_en}</Typography.Text>
          )}
        </div>
        <Space>
          <GlassButton onClick={handleRefresh}>
            刷新
          </GlassButton>
          <GlassButton onClick={() => navigate('/admin-hotels')}>
            返回列表
          </GlassButton>
          {hotel.status === 'pending' && (
            <GlassButton type="primary" onClick={() => navigate(`/audit/${hotel.id}`)}>
              去审核
            </GlassButton>
          )}
          {hotel.status === 'approved' && (
            <GlassButton danger onClick={handleOffline}>
              下架酒店
            </GlassButton>
          )}
          {hotel.status === 'offline' && (
            <GlassButton type="primary" onClick={handleRestore}>
              恢复上架
            </GlassButton>
          )}
        </Space>
      </div>

      {/* 头部大图 */}
      {hotel.images && hotel.images.length > 0 && (
        <Card styles={{ body: { padding: 0 } }} style={{ marginBottom: 24, overflow: 'hidden' }}>
          <Image
            src={hotel.images[0]}
            alt={hotel.name}
            width="100%"
            height={280}
            style={{ objectFit: 'cover' }}
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88P/BfwYACP4D/pHOlKYAAAAASUVORK5CYII="
          />
        </Card>
      )}

      <Row gutter={24}>
        <Col span={16}>
          {/* 基本信息 */}
          <Card title="基本信息" style={{ marginBottom: 24 }}>
            <Descriptions column={2}>
              <Descriptions.Item label={<><EnvironmentOutlined /> 城市</>}>{hotel.city}</Descriptions.Item>
              <Descriptions.Item label="地址">{hotel.address}</Descriptions.Item>
              <Descriptions.Item label={<><StarFilled style={{ color: '#faad14' }} /> 星级</>}>
                {hotel.star_rating ? `${hotel.star_rating} 星级` : '未评级'}
              </Descriptions.Item>
              <Descriptions.Item label={<><CalendarOutlined /> 开业时间</>}>
                {hotel.opening_time || '未填写'}
              </Descriptions.Item>
            </Descriptions>
            {hotel.description && (
              <Typography.Paragraph style={{ marginTop: 16, marginBottom: 0 }}>{hotel.description}</Typography.Paragraph>
            )}
          </Card>

          <Tabs
            items={[
              {
                key: 'overview',
                label: '房间总览',
                children: (
                  <Card style={{ marginBottom: 24 }}>
                    <Row gutter={16}>
                      <Col span={6}>
                        <Statistic title="总房间" value={computedOverview.total} suffix="间" />
                      </Col>
                      <Col span={6}>
                        <Statistic title="已使用" value={computedOverview.used} styles={{ content: { color: '#faad14' } }} suffix="间" />
                      </Col>
                      <Col span={6}>
                        <Statistic title="空闲" value={computedOverview.available} styles={{ content: { color: '#52c41a' } }} suffix="间" />
                      </Col>
                      <Col span={6}>
                        <Statistic title="已下架" value={computedOverview.offline} styles={{ content: { color: '#999' } }} suffix="间" />
                      </Col>
                    </Row>
                    <div style={{ marginTop: 16 }}>
                      <Progress
                        percent={computedOverview.total ? Math.round((computedOverview.used / computedOverview.total) * 100) : 0}
                        status="active"
                        format={(p) => `入住率 ${p}%`}
                      />
                    </div>
                    <Row gutter={16} style={{ marginTop: 16 }}>
                      <Col span={8} style={{ textAlign: 'center' }}>
                        <Progress type="circle" percent={usedPercent} strokeColor="#faad14" />
                        <div style={{ marginTop: 8 }}>已使用占比</div>
                      </Col>
                      <Col span={8} style={{ textAlign: 'center' }}>
                        <Progress type="circle" percent={availablePercent} strokeColor="#52c41a" />
                        <div style={{ marginTop: 8 }}>空闲占比</div>
                      </Col>
                      <Col span={8} style={{ textAlign: 'center' }}>
                        <Progress type="circle" percent={offlinePercent} strokeColor="#999" />
                        <div style={{ marginTop: 8 }}>下架占比</div>
                      </Col>
                    </Row>
                  </Card>
                )
              },
              {
                key: 'rooms',
                label: '房型列表',
                children: (
                  <Card style={{ marginBottom: 24 }}>
                    <Table
                      columns={roomColumns}
                      dataSource={hotel.roomTypes || []}
                      rowKey="id"
                      pagination={false}
                      locale={{ emptyText: '暂无房型信息' }}
                    />
                  </Card>
                )
              },
              {
                key: 'orders',
                label: '订单展示',
                children: (
                  <Card title="订单列表" style={{ marginBottom: 24 }}>
                    <Table
                      columns={orderColumns}
                      dataSource={orders}
                      rowKey="id"
                      loading={ordersLoading}
                      pagination={{
                        current: ordersPage,
                        pageSize: 8,
                        total: ordersTotal,
                        onChange: (page) => setOrdersPage(page)
                      }}
                      locale={{ emptyText: '暂无订单' }}
                    />
                  </Card>
                )
              },
              {
                key: 'stats',
                label: '订单统计',
                children: (
                  <Card loading={statsLoading} style={{ marginBottom: 24 }}>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Statistic title="订单总量" value={orderStats?.totalOrders || 0} />
                      </Col>
                      <Col span={8}>
                        <Statistic title="订单收入" value={orderStats?.revenue || 0} prefix="¥" />
                      </Col>
                      <Col span={8}>
                        <Statistic title="状态种类" value={orderStats?.statusStats?.length || 0} />
                      </Col>
                    </Row>
                    <Row gutter={16} style={{ marginTop: 16 }}>
                      <Col span={8}>
                        <Statistic title="房型数" value={roomTypeSummary.length} />
                      </Col>
                      <Col span={8}>
                        <Statistic title="入住间夜" value={totalRoomNights} />
                      </Col>
                      <Col span={8}>
                        <Statistic title="统计记录" value={(roomTypeDaily.length || 0) + (roomTypeMonthly.length || 0)} />
                      </Col>
                    </Row>
                    <Row gutter={16} style={{ marginTop: 16 }}>
                      <Col span={12}>
                        <Typography.Title level={5} style={{ marginTop: 0 }}>订单状态分布</Typography.Title>
                        <Table
                          columns={[
                            { title: '状态', dataIndex: 'status', key: 'status' },
                            { title: '数量', dataIndex: 'count', key: 'count' }
                          ]}
                          dataSource={orderStats?.statusStats || []}
                          rowKey="status"
                          pagination={false}
                          size="small"
                        />
                      </Col>
                      <Col span={12}>
                        <Typography.Title level={5} style={{ marginTop: 0 }}>月度收入</Typography.Title>
                        <Table
                          columns={[
                            { title: '月份', dataIndex: 'month', key: 'month' },
                            { title: '收入', dataIndex: 'revenue', key: 'revenue', render: (v) => `¥${v}` }
                          ]}
                          dataSource={orderStats?.monthly || []}
                          rowKey="month"
                          pagination={false}
                          size="small"
                        />
                      </Col>
                    </Row>
                    <Row gutter={16} style={{ marginTop: 16 }}>
                      <Col span={24}>
                        <Typography.Title level={5} style={{ marginTop: 0 }}>房型汇总</Typography.Title>
                        <Table
                          columns={roomTypeSummaryColumns}
                          dataSource={roomTypeSummary}
                          rowKey={(record) => `${record.roomTypeName}-${record.nights}-${record.revenue}`}
                          pagination={{ pageSize: 6 }}
                          size="small"
                          locale={{ emptyText: '暂无统计数据' }}
                        />
                      </Col>
                    </Row>
                    <Row gutter={16} style={{ marginTop: 16 }}>
                      <Col span={24}>
                        <Typography.Title level={5} style={{ marginTop: 0 }}>房型日度表现</Typography.Title>
                        <Table
                          columns={roomTypeDailyColumns}
                          dataSource={roomTypeDaily}
                          rowKey={(record) => `${record.date}-${record.roomTypeName}`}
                          pagination={{ pageSize: 6 }}
                          size="small"
                          locale={{ emptyText: '暂无统计数据' }}
                        />
                      </Col>
                    </Row>
                    <Row gutter={16} style={{ marginTop: 16 }}>
                      <Col span={24}>
                        <Typography.Title level={5} style={{ marginTop: 0 }}>房型月度表现</Typography.Title>
                        <Table
                          columns={roomTypeMonthlyColumns}
                          dataSource={roomTypeMonthly}
                          rowKey={(record) => `${record.month}-${record.roomTypeName}`}
                          pagination={{ pageSize: 6 }}
                          size="small"
                          locale={{ emptyText: '暂无统计数据' }}
                        />
                      </Col>
                    </Row>
                  </Card>
                )
              }
            ]}
          />
        </Col>

        <Col span={8}>
          {/* 商户信息 */}
          <Card title="商户信息" style={{ marginBottom: 24 }}>
            <Descriptions column={1}>
              <Descriptions.Item label="商户ID">{hotel.merchant_id}</Descriptions.Item>
              <Descriptions.Item label="联系电话">{hotel.phone || '未填写'}</Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 设施标签 */}
          {hotel.facilities && hotel.facilities.length > 0 && (
            <Card title="设施服务" size="small" style={{ marginBottom: 16 }}>
              <Space wrap>
                {hotel.facilities.map((item, index) => (
                  <Tag key={index} color="blue">{item}</Tag>
                ))}
              </Space>
            </Card>
          )}

          {/* 优惠信息 */}
          {hotel.promotions && hotel.promotions.length > 0 && (
            <Card title="优惠活动" size="small" style={{ marginBottom: 16 }}>
              <Space style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                {hotel.promotions.map((promo, index) => (
                  <div key={index} style={{ padding: '8px 12px', background: '#fff7e6', borderRadius: 4 }}>
                    <Tag color="orange">{promo.type}</Tag>
                    <span>{promo.title}</span>
                    {promo.value && <span style={{ color: '#f5222d', marginLeft: 8 }}>{promo.value}折</span>}
                    {Array.isArray(promo.periods) && promo.periods[0] && (
                      <span style={{ marginLeft: 8, color: '#999' }}>
                        {dayjs(promo.periods[0].start).format('YYYY-MM-DD HH:mm')} ~ {dayjs(promo.periods[0].end).format('YYYY-MM-DD HH:mm')}
                      </span>
                    )}
                  </div>
                ))}
              </Space>
            </Card>
          )}

          {/* 周边信息 */}
          <Card title="周边信息" size="small">
            {hotel.nearby_attractions && hotel.nearby_attractions.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <Typography.Text type="secondary">热门景点</Typography.Text>
                <div style={{ marginTop: 4 }}>
                  {hotel.nearby_attractions.map((item, index) => (
                    <Tag key={index}>{item}</Tag>
                  ))}
                </div>
              </div>
            )}
            {hotel.nearby_transport && hotel.nearby_transport.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <Typography.Text type="secondary">交通出行</Typography.Text>
                <div style={{ marginTop: 4 }}>
                  {hotel.nearby_transport.map((item, index) => (
                    <Tag key={index}>{item}</Tag>
                  ))}
                </div>
              </div>
            )}
            {hotel.nearby_malls && hotel.nearby_malls.length > 0 && (
              <div>
                <Typography.Text type="secondary">购物商场</Typography.Text>
                <div style={{ marginTop: 4 }}>
                  {hotel.nearby_malls.map((item, index) => (
                    <Tag key={index}>{item}</Tag>
                  ))}
                </div>
              </div>
            )}
          </Card>
          
          {/* 图片展示 */}
          {hotel.images && hotel.images.length > 1 && (
            <Card title="酒店图片" style={{ marginTop: 16 }}>
              <Image.PreviewGroup>
                <Space wrap>
                  {hotel.images.slice(1).map((url, index) => (
                    <Image
                      key={index}
                      src={url}
                      alt={`${hotel.name}-${index + 1}`}
                      width={150}
                      height={100}
                      style={{ objectFit: 'cover', borderRadius: 4 }}
                    />
                  ))}
                </Space>
              </Image.PreviewGroup>
            </Card>
          )}
        </Col>
      </Row>
    </>
  )
}
