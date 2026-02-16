import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Tag, Image, Space, Typography, Table, Spin, Row, Col, Tabs, Progress, Statistic, Modal, Form, InputNumber, Radio, DatePicker } from 'antd'
import { StarFilled, EnvironmentOutlined, CalendarOutlined } from '@ant-design/icons'
import { GlassButton, GanttTimeline, glassMessage as message } from '../components'
import dayjs from 'dayjs'
import { api } from '../services'
import { useTranslation } from 'react-i18next'
import { estimateActionColumnWidth } from '../utils/tableWidth'

export default function HotelDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [hotel, setHotel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState(null)
  const [orders, setOrders] = useState([])
  const [ordersTotal, setOrdersTotal] = useState(0)
  const [ordersPage, setOrdersPage] = useState(1)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [discountModal, setDiscountModal] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [discountLoading, setDiscountLoading] = useState(false)

  const fetchHotel = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get(`/api/merchant/hotels/${id}?_t=${Date.now()}`)
      setHotel(data)
    } catch (error) {
      if (error?.response?.status) {
        navigate('/hotels')
      }
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => {
    fetchHotel()
  }, [fetchHotel])

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const data = await api.get(`/api/merchant/hotels/${id}/overview`)
        setOverview(data)
      } catch (error) {
        console.error(t('hotelDetail.errors.overviewFailed'), error)
        setOverview(null)
      }
    }

    const fetchOrders = async () => {
      setOrdersLoading(true)
      try {
        const params = new URLSearchParams({ page: ordersPage, pageSize: 8 })
        const data = await api.get(`/api/merchant/hotels/${id}/orders?${params.toString()}`)
        setOrders(data.list || [])
        setOrdersTotal(data.total || 0)
      } catch (error) {
        console.error(t('hotelDetail.errors.ordersFailed'), error)
      } finally {
        setOrdersLoading(false)
      }
    }

    fetchOverview()
    fetchOrders()
  }, [id, ordersPage, t])

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

  const formatPeriodLabel = (periods) => {
    const list = Array.isArray(periods) ? periods : []
    if (!list.length) return t('hotelDetail.promo.longTerm')
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
    if (val < 0) return t('hotelDetail.promo.discountAmount', { value: Math.abs(val) })
    if (val > 10) return t('hotelDetail.promo.discountAmount', { value: val })
    if (val > 0) return t('hotelDetail.promo.discountRate', { value: val })
    return ''
  }

  const roomActionColumnWidth = useMemo(() => {
    return estimateActionColumnWidth(
      [[t('hotelDetail.room.setDiscount'), t('hotelDetail.room.cancelDiscount')]],
      {
        minColumnWidth: 180,
        maxColumnWidth: 380
      }
    )
  }, [t])

  const openDiscountModal = (room) => {
    setSelectedRoom(room)
    setDiscountModal(true)
  }

  const handleSetDiscount = async (values) => {
    if (!selectedRoom) return
    try {
      setDiscountLoading(true)
      const res = await api.post('/api/merchant/hotels/batch-discount', {
        hotelIds: [hotel.id],
        roomTypeName: selectedRoom.name,
        quantity: values.quantity,
        discount: values.discount,
        periods: values.periods
      })
      if (res && res.data && res.data.successCount === 0) {
        message.warning(t('hotelDetail.discount.notEffective'))
      } else {
        message.success(t('hotelDetail.discount.success'))
      }
      setDiscountModal(false)
      setSelectedRoom(null)
      await fetchHotel()
    } catch (error) {
      console.error(t('hotelDetail.discount.failed'), error)
      message.error(t('hotelDetail.discount.failedRetry'))
    } finally {
      setDiscountLoading(false)
    }
  }

  const handleCancelDiscount = (room) => {
    Modal.confirm({
      title: t('hotelDetail.discount.cancelTitle'),
      content: t('hotelDetail.discount.cancelContent', { name: room?.name || '' }),
      okText: t('hotelDetail.discount.cancelConfirm'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      async onOk() {
        try {
          setDiscountLoading(true)
          await api.post('/api/merchant/hotels/batch-discount', {
            hotelIds: [hotel.id],
            roomTypeName: room.name,
            quantity: 0,
            discount: 0
          })
          message.success(t('hotelDetail.discount.cancelSuccess'))
          await fetchHotel()
        } catch (error) {
          console.error(t('hotelDetail.discount.cancelFailed'), error)
          message.error(t('hotelDetail.discount.cancelFailedRetry'))
        } finally {
          setDiscountLoading(false)
        }
      }
    })
  }

  const roomColumns = [
    { title: t('hotelDetail.room.name'), dataIndex: 'name', key: 'name' },
    { title: t('hotelDetail.room.capacity'), dataIndex: 'capacity', key: 'capacity', width: 80, render: (v) => v ? t('hotelDetail.room.capacityValue', { value: v }) : '-' },
    { title: t('hotelDetail.room.bedWidth'), dataIndex: 'bed_width', key: 'bed_width', width: 80, render: (v) => v ? t('hotelDetail.room.bedWidthValue', { value: v }) : '-' },
    { title: t('hotelDetail.room.area'), dataIndex: 'area', key: 'area', width: 80, render: (v) => v ? t('hotelDetail.room.areaValue', { value: v }) : '-' },
    { title: t('hotelDetail.room.ceiling'), dataIndex: 'ceiling_height', key: 'ceiling_height', width: 80, render: (v) => v ? t('hotelDetail.room.ceilingValue', { value: v }) : '-' },
    {
      title: t('hotelDetail.room.price'),
      dataIndex: 'price',
      key: 'price',
      render: (price, record) => {
        const basePrice = Number(price) || 0
        const discountRate = Number(record.discount_rate) || 0
        const discountQuota = Number(record.discount_quota) || 0
        const discountEffective = discountQuota > 0 && ((discountRate > 0 && discountRate <= 10) || discountRate < 0) && isPeriodEffective(record.discount_periods)
        const now = dayjs()
        const promotionList = (hotel.promotions || []).filter((p) => p && p.title)
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
            <div style={{ color: '#999' }}>{t('hotelDetail.room.basePrice', { value: basePrice })}</div>
            <div style={{ color: '#f5222d', fontWeight: 600 }}>{t('hotelDetail.room.currentPrice', { value: discounted })}</div>
          </div>
        )
      }
    },
    {
      title: t('hotelDetail.room.discount'),
      key: 'discount',
      render: (_, record) => {
        const tags = []
        const discountRate = Number(record.discount_rate) || 0
        const discountQuota = Number(record.discount_quota) || 0
        if (discountQuota > 0 && ((discountRate > 0 && discountRate <= 10) || discountRate < 0)) {
          tags.push(
            <Tag color="purple" key={`batch-${record.id || record.name}`}>
              {discountRate > 0
                ? t('hotelDetail.room.batchDiscountRate', { rate: discountRate, quota: discountQuota })
                : t('hotelDetail.room.batchDiscountAmount', { value: Math.abs(discountRate), quota: discountQuota })}
            </Tag>
          )
        }
        const now = dayjs()
        const promotionList = (hotel.promotions || []).filter((p) => p && p.title)
        const effectivePromos = promotionList.filter(p => {
          const periods = Array.isArray(p.periods) ? p.periods : []
          if (!periods.length) return true
          return periods.some(r => now.isAfter(dayjs(r.start)) && now.isBefore(dayjs(r.end)))
        })
        effectivePromos.forEach((promo, index) => {
          tags.push(
            <Tag color="blue" key={`promo-${record.id || record.name}-${index}`}>
              {promo.title || promo.type || t('hotelDetail.promo.fallback')}
            </Tag>
          )
        })
        return tags.length ? <Space size={[4, 4]} wrap>{tags}</Space> : <Tag>{t('hotelDetail.room.noDiscount')}</Tag>
      }
    },
    { title: t('hotelDetail.room.stock'), dataIndex: 'stock', key: 'stock' },
    { title: t('hotelDetail.room.wifi'), dataIndex: 'wifi', key: 'wifi', width: 70, render: (v) => v === true ? t('hotelDetail.room.wifiYes') : v === false ? t('hotelDetail.room.wifiNo') : '-' },
    { title: t('hotelDetail.room.breakfast'), dataIndex: 'breakfast_included', key: 'breakfast_included', width: 70, render: (v) => v === true ? t('hotelDetail.room.breakfastYes') : v === false ? t('hotelDetail.room.breakfastNo') : '-' },
    {
      title: t('hotelDetail.room.used'),
      dataIndex: 'used_stock',
      key: 'used_stock',
      render: (value) => value || 0
    },
    {
      title: t('hotelDetail.room.available'),
      key: 'available',
      render: (_, record) => {
        const stock = Number(record.stock) || 0
        const used = Number(record.used_stock) || 0
        const active = record.is_active !== false
        return active ? Math.max(stock - used, 0) : 0
      }
    },
    {
      title: t('hotelDetail.room.action'),
      key: 'action',
      width: roomActionColumnWidth,
      render: (_, record) => {
        const discountRate = Number(record.discount_rate) || 0
        const discountQuota = Number(record.discount_quota) || 0
        const hasDiscount = discountQuota > 0 && ((discountRate > 0 && discountRate <= 10) || discountRate < 0)
        return (
          <Space size={[4, 4]} wrap>
            <GlassButton type="link" size="small" onClick={() => openDiscountModal(record)}>{t('hotelDetail.room.setDiscount')}</GlassButton>
            <GlassButton type="link" size="small" danger disabled={!hasDiscount} onClick={() => handleCancelDiscount(record)}>{t('hotelDetail.room.cancelDiscount')}</GlassButton>
          </Space>
        )
      }
    }
  ]

  const orderColumns = [
    { title: t('hotelDetail.order.id'), dataIndex: 'id', key: 'id', width: 90 },
    { title: t('hotelDetail.order.roomType'), dataIndex: 'room_type_name', key: 'room_type_name' },
    { title: t('hotelDetail.order.quantity'), dataIndex: 'quantity', key: 'quantity', width: 70 },
    {
      title: t('hotelDetail.order.price'),
      dataIndex: 'price_per_night',
      key: 'price_per_night',
      render: (price) => <span style={{ color: '#f5222d' }}>¥{price}</span>
    },
    { title: t('hotelDetail.order.nights'), dataIndex: 'nights', key: 'nights', width: 70 },
    {
      title: t('hotelDetail.order.totalPrice'),
      dataIndex: 'total_price',
      key: 'total_price',
      render: (price) => <span style={{ color: '#f5222d', fontWeight: 600 }}>¥{price}</span>
    },
    { title: t('hotelDetail.order.status'), dataIndex: 'status', key: 'status', width: 90 },
    {
      title: t('hotelDetail.order.checkIn'),
      dataIndex: 'check_in',
      key: 'check_in',
      render: (value) => value || '-'
    },
    {
      title: t('hotelDetail.order.createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (value) => value ? new Date(value).toLocaleString() : '-'
    }
  ]

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
          <GlassButton type="primary" onClick={() => navigate(`/hotels/edit/${hotel.id}`)}>
            {t('hotelDetail.actions.edit')}
          </GlassButton>
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
          <Card title={t('hotelDetail.sections.basic')} style={{ marginBottom: 24 }}>
            <Descriptions column={2}>
              <Descriptions.Item label={<><EnvironmentOutlined /> {t('hotelDetail.basic.city')}</>}>{hotel.city}</Descriptions.Item>
              <Descriptions.Item label={t('hotelDetail.basic.address')}>{hotel.address}</Descriptions.Item>
              <Descriptions.Item label={<><StarFilled style={{ color: '#faad14' }} /> {t('hotelDetail.basic.star')}</>}>
                {hotel.star_rating ? t('hotelDetail.basic.starValue', { value: hotel.star_rating }) : t('hotelDetail.basic.unrated')}
              </Descriptions.Item>
              <Descriptions.Item label={<><CalendarOutlined /> {t('hotelDetail.basic.openingTime')}</>}>
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
                label: t('hotelDetail.tabs.overview'),
                children: (
                  <Card style={{ marginBottom: 24 }}>
                    <Row gutter={16}>
                      <Col span={6}>
                        <Statistic title={t('hotelDetail.overview.total')} value={computedOverview.total} suffix={t('hotelDetail.overview.suffixRoom')} />
                      </Col>
                      <Col span={6}>
                        <Statistic title={t('hotelDetail.overview.used')} value={computedOverview.used} styles={{ content: { color: '#faad14' } }} suffix={t('hotelDetail.overview.suffixRoom')} />
                      </Col>
                      <Col span={6}>
                        <Statistic title={t('hotelDetail.overview.available')} value={computedOverview.available} styles={{ content: { color: '#52c41a' } }} suffix={t('hotelDetail.overview.suffixRoom')} />
                      </Col>
                      <Col span={6}>
                        <Statistic title={t('hotelDetail.overview.offline')} value={computedOverview.offline} styles={{ content: { color: '#999' } }} suffix={t('hotelDetail.overview.suffixRoom')} />
                      </Col>
                    </Row>
                    <div style={{ marginTop: 16 }}>
                      <Progress
                        percent={activeTotal ? Math.round((computedOverview.used / activeTotal) * 100) : 0}
                        status="active"
                        format={(p) => t('hotelDetail.overview.occupancyRate', { value: p })}
                      />
                    </div>
                    <Row gutter={16} style={{ marginTop: 16 }}>
                      <Col span={8} style={{ textAlign: 'center' }}>
                        <Progress type="circle" percent={usedPercent} strokeColor="#faad14" format={(p) => `${p}%`} />
                        <div style={{ marginTop: 8 }}>{t('hotelDetail.overview.usedRate')}</div>
                      </Col>
                      <Col span={8} style={{ textAlign: 'center' }}>
                        <Progress type="circle" percent={availablePercent} strokeColor="#52c41a" format={(p) => `${p}%`} />
                        <div style={{ marginTop: 8 }}>{t('hotelDetail.overview.availableRate')}</div>
                      </Col>
                      <Col span={8} style={{ textAlign: 'center' }}>
                        <Progress type="circle" percent={offlinePercent} strokeColor="#999" format={(p) => `${p}%`} />
                        <div style={{ marginTop: 8 }}>{t('hotelDetail.overview.offlineRate')}</div>
                      </Col>
                    </Row>
                  </Card>
                )
              },
              {
                key: 'rooms',
                label: t('hotelDetail.tabs.rooms'),
                children: (
                  <Card style={{ marginBottom: 24 }}>
                    <Table
                      columns={roomColumns}
                      dataSource={hotel.roomTypes || []}
                      rowKey="id"
                      pagination={false}
                      scroll={{ x: 'max-content' }}
                      locale={{ emptyText: t('hotelDetail.emptyRooms') }}
                    />
                  </Card>
                )
              },
              {
                key: 'orders',
                label: t('hotelDetail.tabs.orders'),
                children: (
                  <Card
                    title={(
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{t('hotelDetail.order.title')}</span>
                        <GlassButton type="primary" onClick={() => navigate(`/hotels/${hotel.id}/stats`)}>
                          {t('hotelDetail.order.stats')}
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
                      locale={{ emptyText: t('hotelDetail.emptyOrders') }}
                    />
                  </Card>
                )
              },
              
            ]}
          />

          {/* 图片展示 */}
          {hotel.images && hotel.images.length > 1 && (
            <Card title={t('hotelDetail.sections.images')}>
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

        <Col span={8}>
          {/* 设施标签 */}
          {hotel.facilities && hotel.facilities.length > 0 && (
            <Card title={t('hotelDetail.sections.facilities')} size="small" style={{ marginBottom: 16 }}>
              <Space wrap>
                {hotel.facilities.map((item, index) => (
                  <Tag key={index} color="blue">{item}</Tag>
                ))}
              </Space>
            </Card>
          )}

          {/* 优惠信息 */}
          {hotel.promotions && hotel.promotions.length > 0 && (() => {
            const promotionList = hotel.promotions.filter((promo) => promo && (promo.title || promo.type))
            return (
              <Card title={t('hotelDetail.sections.promotions')} size="small" style={{ marginBottom: 16 }}>
                <Space style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  {promotionList.map((promo, index) => {
                    const valueText = getPromotionValueText(promo.value)
                    return (
                      <div key={index} style={{ padding: '8px 12px', background: '#fff7e6', borderRadius: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          {promo.type && <Tag color="orange">{promo.type}</Tag>}
                          <span>{promo.title || t('hotelDetail.promo.fallback')}</span>
                          {valueText && <span style={{ color: '#f5222d' }}>{valueText}</span>}
                          <span style={{ color: '#999' }}>{t('hotelDetail.promo.period', { value: formatPeriodLabel(promo.periods) })}</span>
                        </div>
                      </div>
                    )
                  })}
                </Space>
                {promotionList.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <GanttTimeline
                      items={promotionList}
                      getTitle={(promo) => promo.title || promo.type || t('hotelDetail.promo.fallback')}
                      getPeriods={(promo) => promo.periods}
                      formatAxisLabel={(value) => dayjs(value).format('YYYY-MM-DD')}
                    />
                  </div>
                )}
              </Card>
            )
          })()}

          {/* 周边信息 */}
          <Card title={t('hotelDetail.sections.nearby')} size="small">
            {hotel.nearby_attractions && hotel.nearby_attractions.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <Typography.Text type="secondary">{t('hotelDetail.nearby.attractions')}</Typography.Text>
                <div style={{ marginTop: 4 }}>
                  {hotel.nearby_attractions.map((item, index) => (
                    <Tag key={index}>{item}</Tag>
                  ))}
                </div>
              </div>
            )}
            {hotel.nearby_transport && hotel.nearby_transport.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <Typography.Text type="secondary">{t('hotelDetail.nearby.transport')}</Typography.Text>
                <div style={{ marginTop: 4 }}>
                  {hotel.nearby_transport.map((item, index) => (
                    <Tag key={index}>{item}</Tag>
                  ))}
                </div>
              </div>
            )}
            {hotel.nearby_malls && hotel.nearby_malls.length > 0 && (
              <div>
                <Typography.Text type="secondary">{t('hotelDetail.nearby.malls')}</Typography.Text>
                <div style={{ marginTop: 4 }}>
                  {hotel.nearby_malls.map((item, index) => (
                    <Tag key={index}>{item}</Tag>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
      <DiscountModal
        open={discountModal}
        selectedRoom={selectedRoom}
        onClose={() => {
          setDiscountModal(false)
          setSelectedRoom(null)
        }}
        onSubmit={handleSetDiscount}
        loading={discountLoading}
      />
    </>
  )
}

function DiscountModal({ open, selectedRoom, onClose, onSubmit, loading }) {
  const [form] = Form.useForm()
  const { t } = useTranslation()
  const formDiscountType = Form.useWatch('type', form) || 'rate'

  useEffect(() => {
    if (open) {
      form.setFieldsValue({ quantity: 1, discount: 9, type: 'rate', amount: 50, periods: [] })
    }
  }, [open, form])

  const handleClose = () => {
    form.resetFields()
    onClose()
  }

  const handleFinish = (values) => {
    const payload = {
      quantity: values.quantity,
      discount: values.type === 'rate' ? values.discount : -Math.abs(values.amount),
      periods: Array.isArray(values.periods) && values.periods.length === 2
        ? [{ start: values.periods[0].toISOString(), end: values.periods[1].toISOString() }]
        : []
    }
    onSubmit(payload)
  }

  return (
    <Modal
      title={selectedRoom ? t('hotelDetail.discount.titleWithRoom', { name: selectedRoom.name }) : t('hotelDetail.discount.title')}
      open={open}
      onCancel={handleClose}
      footer={null}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" initialValues={{ quantity: 1, discount: 9, type: 'rate', amount: 50 }} onFinish={handleFinish}>
        <Form.Item name="quantity" label={t('hotelDetail.discount.quantity')} rules={[{ required: true }]}>
          <InputNumber
            min={1}
            style={{ width: 150 }}
            formatter={(value) => t('hotelDetail.discount.quantityValue', { value })}
            parser={(value) => value?.replace(/[^\d]/g, '')}
          />
        </Form.Item>

        <Form.Item name="type" label={t('hotelDetail.discount.type')} rules={[{ required: true }]}>
          <Radio.Group>
            <Radio value="rate">{t('hotelDetail.discount.typeRate')}</Radio>
            <Radio value="amount">{t('hotelDetail.discount.typeAmount')}</Radio>
          </Radio.Group>
        </Form.Item>

        {formDiscountType === 'rate' ? (
          <Form.Item name="discount" label={t('hotelDetail.discount.rate')} rules={[{ required: true }]}>
            <InputNumber
              min={0.1}
              max={10}
              step={0.5}
              style={{ width: 150 }}
              formatter={(value) => t('hotelDetail.discount.rateValue', { value })}
              parser={(value) => value?.replace(/[^\d.]/g, '')}
            />
          </Form.Item>
        ) : (
          <Form.Item 
            name="amount" 
            label={t('hotelDetail.discount.amount')} 
            rules={[
              { required: true },
              {
                validator: (_, value) => {
                  if (selectedRoom && value > Number(selectedRoom.price)) {
                    return Promise.reject(t('hotelDetail.discount.amountTooHigh'))
                  }
                  return Promise.resolve()
                }
              }
            ]}
          >
            <InputNumber
              min={1}
              max={selectedRoom ? Number(selectedRoom.price) : undefined}
              style={{ width: 150 }}
              formatter={(value) => t('hotelDetail.discount.amountValue', { value })}
              parser={(value) => value?.replace(/[^\d]/g, '')}
            />
          </Form.Item>
        )}
        <Form.Item name="periods" label={t('hotelDetail.discount.periods')}>
          <DatePicker.RangePicker showTime style={{ width: 360 }} />
        </Form.Item>

        <Form.Item>
          <Space>
            <GlassButton type="primary" loading={loading} onClick={() => form.submit()}>
              {t('common.confirm')}
            </GlassButton>
            <GlassButton onClick={handleClose}>{t('common.cancel')}</GlassButton>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  )
}
