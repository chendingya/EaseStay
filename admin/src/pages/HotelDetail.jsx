import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Carousel, Col, Descriptions, Image, Modal, Progress, Row, Space, Spin, Statistic, Tabs, Tag, Typography } from 'antd'
import StarFilled from '@ant-design/icons/es/icons/StarFilled'
import EnvironmentOutlined from '@ant-design/icons/es/icons/EnvironmentOutlined'
import CalendarOutlined from '@ant-design/icons/es/icons/CalendarOutlined'
import { GlassButton, GanttTimeline, glassMessage as message } from '../components'
import dayjs from 'dayjs'
import { api } from '../services'
import { useTranslation } from 'react-i18next'

const RoomsTab = lazy(() => import('../components/hotel-detail/RoomsTab.jsx'))
const OrdersTab = lazy(() => import('../components/hotel-detail/OrdersTab.jsx'))
const DiscountModal = lazy(() => import('../components/hotel-detail/DiscountModal.jsx'))

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
  const [activeTab, setActiveTab] = useState('overview')
  const [discountModal, setDiscountModal] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [discountLoading, setDiscountLoading] = useState(false)
  const [renderPromotionTimeline, setRenderPromotionTimeline] = useState(false)

  const fetchHotel = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get(`/api/merchant/hotels/${id}`)
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
    setActiveTab('overview')
    setOrdersPage(1)
    setOrders([])
    setOrdersTotal(0)
  }, [id])

  useEffect(() => {
    if (!hotel?.id) return

    let canceled = false
    const fetchOverview = async () => {
      try {
        const data = await api.get(`/api/merchant/hotels/${id}/overview`)
        if (!canceled) setOverview(data)
      } catch {
        if (!canceled) setOverview(null)
      }
    }

    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(() => {
        fetchOverview()
      }, { timeout: 1500 })
      return () => {
        canceled = true
        if (typeof window.cancelIdleCallback === 'function') {
          window.cancelIdleCallback(idleId)
        }
      }
    }

    const timerId = setTimeout(fetchOverview, 300)
    return () => {
      canceled = true
      clearTimeout(timerId)
    }
  }, [hotel?.id, id])

  useEffect(() => {
    if (activeTab !== 'orders') return
    const fetchOrders = async () => {
      setOrdersLoading(true)
      try {
        const params = new URLSearchParams({ page: ordersPage, pageSize: 8 })
        const data = await api.get(`/api/merchant/hotels/${id}/orders?${params.toString()}`)
        setOrders(data.list || [])
        setOrdersTotal(data.total || 0)
      } catch (error) {
        console.error(error)
      } finally {
        setOrdersLoading(false)
      }
    }
    fetchOrders()
  }, [activeTab, id, ordersPage])

  useEffect(() => {
    const hasPromotions = Array.isArray(hotel?.promotions) && hotel.promotions.length > 0
    if (!hasPromotions) {
      setRenderPromotionTimeline(false)
      return
    }
    let canceled = false
    const showTimeline = () => {
      if (!canceled) setRenderPromotionTimeline(true)
    }
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(showTimeline, { timeout: 1200 })
      return () => {
        canceled = true
        if (typeof window.cancelIdleCallback === 'function') {
          window.cancelIdleCallback(idleId)
        }
      }
    }
    const timer = setTimeout(showTimeline, 300)
    return () => {
      canceled = true
      clearTimeout(timer)
    }
  }, [hotel?.promotions])

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
  const getPromotionValueText = (value) => {
    const val = Number(value) || 0
    if (val < 0) return t('hotelDetail.promo.discountAmount', { value: Math.abs(val) })
    if (val > 10) return t('hotelDetail.promo.discountAmount', { value: val })
    if (val > 0) return t('hotelDetail.promo.discountRate', { value: val })
    return ''
  }
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
          <Image.PreviewGroup>
            <Carousel autoplay={hotel.images.length > 1} dots={hotel.images.length > 1}>
              {hotel.images.map((url, index) => (
                <div key={`${url}-${index}`}>
                  <Image
                    src={url}
                    alt={`${hotel.name}-${index + 1}`}
                    width="100%"
                    height={280}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    style={{ objectFit: 'cover', display: 'block' }}
                    fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88P/BfwYACP4D/pHOlKYAAAAASUVORK5CYII="
                  />
                </div>
              ))}
            </Carousel>
          </Image.PreviewGroup>
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
            activeKey={activeTab}
            onChange={setActiveTab}
            destroyOnHidden
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
                children:
                  activeTab === 'rooms' ? (
                    <Suspense fallback={<div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>}>
                      <RoomsTab
                        roomTypes={hotel.roomTypes || []}
                        formatPeriodLabel={formatPeriodLabel}
                        onOpenDiscount={openDiscountModal}
                        onCancelDiscount={handleCancelDiscount}
                      />
                    </Suspense>
                  ) : null
              },
              {
                key: 'orders',
                label: t('hotelDetail.tabs.orders'),
                children:
                  activeTab === 'orders' ? (
                    <Suspense fallback={<div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>}>
                      <OrdersTab
                        hotelId={hotel.id}
                        orders={orders}
                        loading={ordersLoading}
                        page={ordersPage}
                        total={ordersTotal}
                        onPageChange={setOrdersPage}
                        onViewStats={(hotelId) => navigate(`/hotels/${hotelId}/stats`)}
                      />
                    </Suspense>
                  ) : null
              }
            ]}
          />

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
                {promotionList.length > 0 && renderPromotionTimeline && (
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
      {discountModal && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}
    </>
  )
}
