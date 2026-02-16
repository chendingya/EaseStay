import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Tag, Image, Space, Typography, Table, Spin, Row, Col, Modal, Input, Tabs, Progress, Statistic } from 'antd'
import { StarFilled, EnvironmentOutlined, CalendarOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { GlassButton, GanttTimeline, glassMessage as message } from '../components'
import dayjs from 'dayjs'
import { api } from '../services'
import { useTranslation } from 'react-i18next'

export default function AdminHotelDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
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
      console.error(error)
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
      console.error(error)
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
    message.success(t('adminHotelDetail.refreshSuccess'))
  }

  // 下架酒店
  const handleOffline = () => {
    let reason = ''
    Modal.confirm({
      title: t('adminHotelDetail.offline.title'),
      icon: <ExclamationCircleOutlined />,
      content: (
        <div style={{ marginTop: 16 }}>
          <Typography.Text>{t('adminHotelDetail.offline.reasonLabel')}</Typography.Text>
          <Input.TextArea 
            rows={3} 
            placeholder={t('adminHotelDetail.offline.reasonPlaceholder')} 
            onChange={(e) => { reason = e.target.value }}
            style={{ marginTop: 8 }}
          />
        </div>
      ),
      okText: t('adminHotelDetail.offline.confirm'),
      okButtonProps: { danger: true },
      cancelText: t('common.cancel'),
      async onOk() {
        if (!reason.trim()) {
          message.warning(t('adminHotelDetail.offline.reasonRequired'))
          return Promise.reject()
        }
        try {
          await api.put(`/api/admin/hotels/${id}/offline`, { reason })
          message.success(t('adminHotelDetail.offline.success'))
          fetchHotel()
        } catch (error) {
          console.error(error)
          message.error(t('adminHotelDetail.offline.error'))
        }
      }
    })
  }

  // 恢复上架
  const handleRestore = async () => {
    Modal.confirm({
      title: t('adminHotelDetail.restore.title'),
      icon: <ExclamationCircleOutlined />,
      content: t('adminHotelDetail.restore.content'),
      okText: t('adminHotelDetail.restore.confirm'),
      cancelText: t('common.cancel'),
      async onOk() {
        try {
          await api.put(`/api/admin/hotels/${id}/restore`)
          message.success(t('adminHotelDetail.restore.success'))
          fetchHotel()
        } catch (error) {
          console.error(error)
          message.error(t('adminHotelDetail.restore.error'))
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

  const statusMap = {
    pending: { color: 'orange', label: t('status.pending') },
    approved: { color: 'green', label: t('status.approved') },
    rejected: { color: 'red', label: t('status.rejected') },
    offline: { color: 'default', label: t('status.offline') }
  }
  const statusInfo = statusMap[hotel.status] || { color: 'default', label: hotel.status }
  const promotionList = (hotel.promotions || []).filter((promo) => promo && (promo.title || promo.type))
  const formatPeriodLabel = (periods) => {
    const list = Array.isArray(periods) ? periods : []
    if (!list.length) return t('adminHotelDetail.promo.longTerm')
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
    if (val < 0) return t('adminHotelDetail.promo.discountAmount', { count: Math.abs(val) })
    if (val > 10) return t('adminHotelDetail.promo.discountAmount', { count: val })
    if (val > 0) return t('adminHotelDetail.promo.discountRate', { count: val })
    return ''
  }
  const getRoomImages = (room) => {
    const candidates = [room?.images, room?.image_urls, room?.room_images]
    for (const source of candidates) {
      if (Array.isArray(source) && source.length > 0) {
        return source.filter(Boolean)
      }
    }
    return []
  }

  // Columns definitions
  const roomColumns = [
    { title: t('adminHotelDetail.room.name'), dataIndex: 'name', key: 'name' },
    { title: t('adminHotelDetail.room.status'), dataIndex: 'is_active', key: 'is_active', width: 80, render: (active) => active === false ? <Tag color="default">{t('adminHotelDetail.room.offline')}</Tag> : <Tag color="green">{t('adminHotelDetail.room.online')}</Tag> },
    { title: t('adminHotelDetail.room.capacity'), dataIndex: 'capacity', key: 'capacity', width: 80, render: (v) => v ? t('adminHotelDetail.room.capacityValue', { value: v }) : '-' },
    { title: t('adminHotelDetail.room.bedWidth'), dataIndex: 'bed_width', key: 'bed_width', width: 80, render: (v) => v ? t('adminHotelDetail.room.bedWidthValue', { value: v }) : '-' },
    { title: t('adminHotelDetail.room.area'), dataIndex: 'area', key: 'area', width: 80, render: (v) => v ? t('adminHotelDetail.room.areaValue', { value: v }) : '-' },
    { title: t('adminHotelDetail.room.ceiling'), dataIndex: 'ceiling_height', key: 'ceiling_height', width: 80, render: (v) => v ? t('adminHotelDetail.room.ceilingValue', { value: v }) : '-' },
    {
      title: t('adminHotelDetail.room.images'),
      dataIndex: 'images',
      key: 'images',
      width: 180,
      render: (_, record) => {
        const images = getRoomImages(record)
        if (!images.length) return <Typography.Text type="secondary">{t('adminHotelDetail.room.noImages')}</Typography.Text>
        const preview = images.slice(0, 3)
        return (
          <Image.PreviewGroup>
            <Space size={6} wrap>
              {preview.map((url, idx) => (
                <Image
                  key={`${record.id || record.name}-img-${idx}`}
                  src={url}
                  width={44}
                  height={32}
                  style={{ objectFit: 'cover', borderRadius: 4 }}
                />
              ))}
              {images.length > 3 && <Tag>{`+${images.length - 3}`}</Tag>}
            </Space>
          </Image.PreviewGroup>
        )
      }
    },
    {
      title: t('adminHotelDetail.room.price'),
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
            <div style={{ color: '#999' }}>{t('adminHotelDetail.room.basePrice', { value: basePrice })}</div>
            <div style={{ color: '#f5222d', fontWeight: 600 }}>{t('adminHotelDetail.room.currentPrice', { value: discounted })}</div>
          </div>
        )
      }
    },
    {
      title: t('adminHotelDetail.room.discount'),
      key: 'discount',
      render: (_, record) => {
        const tags = []
        const discountRate = Number(record.discount_rate) || 0
        const discountQuota = Number(record.discount_quota) || 0
        if (discountQuota > 0 && ((discountRate > 0 && discountRate <= 10) || discountRate < 0)) {
          const period = formatPeriodLabel(record.discount_periods)
          tags.push(
            <Tag color="purple" key={`batch-${record.id || record.name}`}>
              {discountRate > 0
                ? t('adminHotelDetail.room.batchDiscountRate', { count: discountRate, quota: discountQuota })
                : t('adminHotelDetail.room.batchDiscountAmount', { count: Math.abs(discountRate), quota: discountQuota })}
              {period ? ` · ${period}` : ''}
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
              {promo.title || promo.type || t('adminHotelDetail.room.promoFallback')}
            </Tag>
          )
        })
        return tags.length ? <Space size={[4, 4]} wrap>{tags}</Space> : <Tag>{t('adminHotelDetail.room.noDiscount')}</Tag>
      }
    },
    { title: t('adminHotelDetail.room.stock'), dataIndex: 'stock', key: 'stock' },
    { title: t('adminHotelDetail.room.wifi'), dataIndex: 'wifi', key: 'wifi', width: 70, render: (v) => v === true ? t('common.yes') : v === false ? t('common.no') : '-' },
    { title: t('adminHotelDetail.room.breakfast'), dataIndex: 'breakfast_included', key: 'breakfast_included', width: 70, render: (v) => v === true ? t('common.yes') : v === false ? t('common.no') : '-' },
    {
      title: t('adminHotelDetail.room.used'),
      dataIndex: 'used_stock',
      key: 'used_stock',
      render: (value) => value || 0
    },
    {
      title: t('adminHotelDetail.room.available'),
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
    { title: t('adminHotelDetail.order.id'), dataIndex: 'id', key: 'id', width: 90 },
    { title: t('adminHotelDetail.order.roomType'), dataIndex: 'room_type_name', key: 'room_type_name' },
    { title: t('adminHotelDetail.order.quantity'), dataIndex: 'quantity', key: 'quantity', width: 70 },
    {
      title: t('adminHotelDetail.order.price'),
      dataIndex: 'price_per_night',
      key: 'price_per_night',
      render: (price) => <span style={{ color: '#f5222d' }}>¥{price}</span>
    },
    { title: t('adminHotelDetail.order.nights'), dataIndex: 'nights', key: 'nights', width: 70 },
    {
      title: t('adminHotelDetail.order.totalPrice'),
      dataIndex: 'total_price',
      key: 'total_price',
      render: (price) => <span style={{ color: '#f5222d', fontWeight: 600 }}>¥{price}</span>
    },
    { title: t('adminHotelDetail.order.status'), dataIndex: 'status', key: 'status', width: 90 },
    {
      title: t('adminHotelDetail.order.checkIn'),
      dataIndex: 'check_in',
      key: 'check_in',
      render: (value) => value || '-'
    },
    {
      title: t('adminHotelDetail.order.createdAt'),
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
            {t('common.refresh')}
          </GlassButton>
          <GlassButton onClick={() => navigate('/admin-hotels')}>
            {t('common.backToList')}
          </GlassButton>
          {hotel.status === 'pending' && (
            <GlassButton type="primary" onClick={() => navigate(`/audit/${hotel.id}`)}>
              {t('adminHotelDetail.goAudit')}
            </GlassButton>
          )}
          {hotel.status === 'approved' && (
            <GlassButton danger onClick={handleOffline}>
              {t('adminHotelDetail.offline.action')}
            </GlassButton>
          )}
          {hotel.status === 'offline' && (
            <GlassButton type="primary" onClick={handleRestore}>
              {t('adminHotelDetail.restore.action')}
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
          <Card title={t('adminHotelDetail.sections.basic')} style={{ marginBottom: 24 }}>
            <Descriptions column={2}>
              <Descriptions.Item label={<><EnvironmentOutlined /> {t('adminHotelDetail.basic.city')}</>}>{hotel.city}</Descriptions.Item>
              <Descriptions.Item label={t('adminHotelDetail.basic.address')}>{hotel.address}</Descriptions.Item>
              <Descriptions.Item label={<><StarFilled style={{ color: '#faad14' }} /> {t('adminHotelDetail.basic.star')}</>}>
                {hotel.star_rating ? t('adminHotelDetail.basic.starValue', { value: hotel.star_rating }) : t('adminHotelDetail.basic.unrated')}
              </Descriptions.Item>
              <Descriptions.Item label={<><CalendarOutlined /> {t('adminHotelDetail.basic.openingTime')}</>}>
                {hotel.opening_time || t('common.notFilled')}
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
                label: t('adminHotelDetail.tabs.overview'),
                children: (
                  <Card style={{ marginBottom: 24 }}>
                    <Row gutter={16}>
                      <Col span={6}>
                        <Statistic title={t('adminHotelDetail.overview.total')} value={computedOverview.total} suffix={t('adminHotelDetail.overview.suffixRoom')} />
                      </Col>
                      <Col span={6}>
                        <Statistic title={t('adminHotelDetail.overview.used')} value={computedOverview.used} styles={{ content: { color: '#faad14' } }} suffix={t('adminHotelDetail.overview.suffixRoom')} />
                      </Col>
                      <Col span={6}>
                        <Statistic title={t('adminHotelDetail.overview.available')} value={computedOverview.available} styles={{ content: { color: '#52c41a' } }} suffix={t('adminHotelDetail.overview.suffixRoom')} />
                      </Col>
                      <Col span={6}>
                        <Statistic title={t('adminHotelDetail.overview.offline')} value={computedOverview.offline} styles={{ content: { color: '#999' } }} suffix={t('adminHotelDetail.overview.suffixRoom')} />
                      </Col>
                    </Row>
                    <div style={{ marginTop: 16 }}>
                      <Progress
                        percent={activeTotal ? Math.round((computedOverview.used / activeTotal) * 100) : 0}
                        status="active"
                        format={(p) => t('adminHotelDetail.overview.occupancyRate', { value: p })}
                      />
                    </div>
                    <Row gutter={16} style={{ marginTop: 16 }}>
                      <Col span={8} style={{ textAlign: 'center' }}>
                        <Progress type="circle" percent={usedPercent} strokeColor="#faad14" format={(p) => `${p}%`} />
                        <div style={{ marginTop: 8 }}>{t('adminHotelDetail.overview.usedRate')}</div>
                      </Col>
                      <Col span={8} style={{ textAlign: 'center' }}>
                        <Progress type="circle" percent={availablePercent} strokeColor="#52c41a" format={(p) => `${p}%`} />
                        <div style={{ marginTop: 8 }}>{t('adminHotelDetail.overview.availableRate')}</div>
                      </Col>
                      <Col span={8} style={{ textAlign: 'center' }}>
                        <Progress type="circle" percent={offlinePercent} strokeColor="#999" format={(p) => `${p}%`} />
                        <div style={{ marginTop: 8 }}>{t('adminHotelDetail.overview.offlineRate')}</div>
                      </Col>
                    </Row>
                  </Card>
                )
              },
              {
                key: 'rooms',
                label: t('adminHotelDetail.tabs.rooms'),
                children: (
                  <Card style={{ marginBottom: 24 }}>
                    <Table
                      columns={roomColumns}
                      dataSource={hotel.roomTypes || []}
                      rowKey="id"
                      pagination={false}
                      scroll={{ x: 'max-content' }}
                      locale={{ emptyText: t('adminHotelDetail.emptyRooms') }}
                    />
                  </Card>
                )
              },
              {
                key: 'orders',
                label: t('adminHotelDetail.tabs.orders'),
                children: (
                  <Card
                    title={(
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{t('adminHotelDetail.order.title')}</span>
                        <GlassButton type="primary" onClick={() => navigate(`/admin-hotels/${hotel.id}/stats`)}>
                          {t('adminHotelDetail.order.stats')}
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
                      locale={{ emptyText: t('adminHotelDetail.emptyOrders') }}
                    />
                  </Card>
                )
              },
              
            ]}
          />
        </Col>

        <Col span={8}>
          {/* 商户信息 */}
          <Card title={t('adminHotelDetail.sections.merchant')} style={{ marginBottom: 24 }}>
            <Descriptions column={1}>
              <Descriptions.Item label={t('adminHotelDetail.merchant.id')}>{hotel.merchant_id}</Descriptions.Item>
              <Descriptions.Item label={t('adminHotelDetail.merchant.phone')}>{hotel.phone || t('common.notFilled')}</Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 设施标签 */}
          {hotel.facilities && hotel.facilities.length > 0 && (
            <Card title={t('adminHotelDetail.sections.facilities')} size="small" style={{ marginBottom: 16 }}>
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
              <Card title={t('adminHotelDetail.sections.promotions')} size="small" style={{ marginBottom: 16 }}>
                <Space style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  {list.map((promo, index) => {
                    const valueText = getPromotionValueText(promo.value)
                    return (
                      <div key={index} style={{ padding: '8px 12px', background: '#fff7e6', borderRadius: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          {promo.type && <Tag color="orange">{promo.type}</Tag>}
                          <span>{promo.title || t('adminHotelDetail.promo.fallback')}</span>
                          {valueText && <span style={{ color: '#f5222d' }}>{valueText}</span>}
                          <span style={{ color: '#999' }}>{t('adminHotelDetail.promo.period', { value: formatPeriodLabel(promo.periods) })}</span>
                        </div>
                      </div>
                    )
                  })}
                </Space>
                {list.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <GanttTimeline
                      items={list}
                      getTitle={(promo) => promo.title || promo.type || t('adminHotelDetail.promo.fallback')}
                      getPeriods={(promo) => promo.periods}
                      formatAxisLabel={(value) => dayjs(value).format('YYYY-MM-DD')}
                    />
                  </div>
                )}
              </Card>
            )
          })()}

          {/* 周边信息 */}
          <Card title={t('adminHotelDetail.sections.nearby')} size="small">
            {hotel.nearby_attractions && hotel.nearby_attractions.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <Typography.Text type="secondary">{t('adminHotelDetail.nearby.attractions')}</Typography.Text>
                <div style={{ marginTop: 4 }}>
                  {hotel.nearby_attractions.map((item, index) => (
                    <Tag key={index}>{item}</Tag>
                  ))}
                </div>
              </div>
            )}
            {hotel.nearby_transport && hotel.nearby_transport.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <Typography.Text type="secondary">{t('adminHotelDetail.nearby.transport')}</Typography.Text>
                <div style={{ marginTop: 4 }}>
                  {hotel.nearby_transport.map((item, index) => (
                    <Tag key={index}>{item}</Tag>
                  ))}
                </div>
              </div>
            )}
            {hotel.nearby_malls && hotel.nearby_malls.length > 0 && (
              <div>
                <Typography.Text type="secondary">{t('adminHotelDetail.nearby.malls')}</Typography.Text>
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
            <Card title={t('adminHotelDetail.sections.images')} style={{ marginTop: 16 }}>
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
