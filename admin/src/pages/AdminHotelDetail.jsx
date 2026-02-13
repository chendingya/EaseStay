import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Tag, Image, Space, Typography, Table, Spin, Row, Col, Modal, Input, Tabs, Progress, Statistic } from 'antd'
import { StarFilled, EnvironmentOutlined, CalendarOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { GlassButton, GanttTimeline, glassMessage as message } from '../components'
import dayjs from 'dayjs'
import { api } from '../services'

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

  useEffect(() => {
    fetchHotel()
    fetchOverview()
  }, [fetchHotel, fetchOverview])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleRefresh = async () => {
    await Promise.all([
      fetchHotel(),
      fetchOverview(),
      fetchOrders()
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
  const promotionList = (hotel.promotions || []).filter((promo) => promo && (promo.title || promo.type))
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
  const getPromotionValueText = (value) => {
    const val = Number(value) || 0
    if (val < 0) return `立减 ${Math.abs(val)} 元`
    if (val > 10) return `立减 ${val} 元`
    if (val > 0) return `${val} 折`
    return ''
  }

  // Columns definitions
  const roomColumns = [
    { title: '房型名称', dataIndex: 'name', key: 'name' },
    { title: '状态', dataIndex: 'is_active', key: 'is_active', width: 80, render: (active) => active === false ? <Tag color="default">已下架</Tag> : <Tag color="green">已上架</Tag> },
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
              {discountRate > 0 ? `批量折扣 ${discountRate}折 余${discountQuota}` : `立减 ${Math.abs(discountRate)}元 余${discountQuota}`}
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
        const active = record.is_active !== false
        return active ? Math.max(stock - used, 0) : 0
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
        const active = room.is_active !== false
        const available = active ? Math.max(stock - used, 0) : 0
        const offline = active ? 0 : Math.max(stock - used, 0)
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
  const activeTotal = Math.max(overviewTotal - (computedOverview.offline || 0), 0)
  const usedPercent = activeTotal ? Math.round((computedOverview.used / activeTotal) * 100) : 0
  const availablePercent = activeTotal ? Math.round((computedOverview.available / activeTotal) * 100) : 0
  const offlinePercent = overviewTotal ? Math.round((computedOverview.offline / overviewTotal) * 100) : 0
  

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
                        percent={activeTotal ? Math.round((computedOverview.used / activeTotal) * 100) : 0}
                        status="active"
                        format={(p) => `入住率 ${p}%`}
                      />
                    </div>
                    <Row gutter={16} style={{ marginTop: 16 }}>
                      <Col span={8} style={{ textAlign: 'center' }}>
                        <Progress type="circle" percent={usedPercent} strokeColor="#faad14" format={(p) => `${p}%`} />
                        <div style={{ marginTop: 8 }}>已使用占比</div>
                      </Col>
                      <Col span={8} style={{ textAlign: 'center' }}>
                        <Progress type="circle" percent={availablePercent} strokeColor="#52c41a" format={(p) => `${p}%`} />
                        <div style={{ marginTop: 8 }}>空闲占比</div>
                      </Col>
                      <Col span={8} style={{ textAlign: 'center' }}>
                        <Progress type="circle" percent={offlinePercent} strokeColor="#999" format={(p) => `${p}%`} />
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
                      scroll={{ x: 'max-content' }}
                      locale={{ emptyText: '暂无房型信息' }}
                    />
                  </Card>
                )
              },
              {
                key: 'orders',
                label: '订单展示',
                children: (
                  <Card
                    title={(
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>订单列表</span>
                        <GlassButton type="primary" onClick={() => navigate(`/admin-hotels/${hotel.id}/stats`)}>
                          订单统计
                        </GlassButton>
                      </div>
                    )}
                    style={{ marginBottom: 24 }}
                  >
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
                      scroll={{ x: 'max-content' }}
                      locale={{ emptyText: '暂无订单' }}
                    />
                  </Card>
                )
              },
              
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
          {hotel.promotions && hotel.promotions.length > 0 && (() => {
            const list = promotionList
            return (
              <Card title="优惠活动" size="small" style={{ marginBottom: 16 }}>
                <Space style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  {list.map((promo, index) => {
                    const valueText = getPromotionValueText(promo.value)
                    return (
                      <div key={index} style={{ padding: '8px 12px', background: '#fff7e6', borderRadius: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          {promo.type && <Tag color="orange">{promo.type}</Tag>}
                          <span>{promo.title || '优惠活动'}</span>
                          {valueText && <span style={{ color: '#f5222d' }}>{valueText}</span>}
                          <span style={{ color: '#999' }}>有效期 {formatPeriodLabel(promo.periods)}</span>
                        </div>
                      </div>
                    )
                  })}
                </Space>
                {list.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <GanttTimeline
                      items={list}
                      getTitle={(promo) => promo.title || promo.type || '优惠'}
                      getPeriods={(promo) => promo.periods}
                      formatAxisLabel={(value) => dayjs(value).format('YYYY-MM-DD')}
                    />
                  </div>
                )}
              </Card>
            )
          })()}

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
