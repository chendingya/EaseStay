import { Card, Typography, Tag, Descriptions, Image, Table, Space, Row, Col, Divider, Form, Input, Modal, Spin, Empty, Alert, Badge } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  StarFilled, EnvironmentOutlined, CalendarOutlined, CheckCircleOutlined, 
  CloseCircleOutlined, ArrowLeftOutlined, PictureOutlined, HomeOutlined,
  GiftOutlined, AppstoreOutlined, CarOutlined, ShopOutlined, CompassOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import { GlassButton, glassMessage as message } from '../components'
import { api } from '../services'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'

export default function AuditDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [hotel, setHotel] = useState(null)
  const [pendingRequests, setPendingRequests] = useState([])
  const [rejecting, setRejecting] = useState(false)
  const [offlineModal, setOfflineModal] = useState(false)
  const [rejectForm] = Form.useForm()
  const [offlineForm] = Form.useForm()
  const [actionLoading, setActionLoading] = useState(false)

  const statusMap = {
    pending: { color: 'orange', label: t('status.pending') },
    approved: { color: 'green', label: t('status.approved') },
    rejected: { color: 'red', label: t('status.rejected') },
    offline: { color: 'default', label: t('status.offline') }
  }

  const requestTypeMap = {
    facility: t('auditDetail.requestType.facility'),
    room_type: t('auditDetail.requestType.roomType'),
    promotion: t('auditDetail.requestType.promotion'),
    hotel_delete: t('auditDetail.requestType.hotelDelete')
  }

  const fetchHotel = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get(`/api/admin/hotels/${id}`)
      setHotel(data)
    } catch (error) {
      console.error(error)
      message.error(t('auditDetail.fetchHotelError'))
    } finally {
      setLoading(false)
    }
  }, [id, t])

  const fetchPendingRequests = useCallback(async () => {
    try {
      const data = await api.get(`/api/admin/requests?hotelId=${id}`)
      if (Array.isArray(data)) {
        setPendingRequests(data)
      }
    } catch (error) {
      console.error(error)
    }
  }, [id])

  useEffect(() => {
    fetchHotel()
    fetchPendingRequests()
  }, [fetchHotel, fetchPendingRequests])

  const updateStatus = async (status, rejectReason) => {
    setActionLoading(true)
    try {
      await api.patch(`/api/admin/hotels/${id}/status`, { status, rejectReason })
      message.success(
        status === 'approved' ? t('auditDetail.action.approvedSuccess') 
        : status === 'rejected' ? t('auditDetail.action.rejectedSuccess') 
        : status === 'offline' ? t('auditDetail.action.offlineSuccess')
        : t('common.success')
      )
      window.dispatchEvent(new Event('admin-pending-update'))
      setRejecting(false)
      setOfflineModal(false)
      rejectForm.resetFields()
      offlineForm.resetFields()
      fetchHotel()
    } catch (error) {
      console.error(error)
      message.error(t('common.errorRetry'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = () => {
    rejectForm.validateFields().then(values => {
      updateStatus('rejected', values.reason)
    })
  }

  const handleOffline = () => {
    offlineForm.validateFields().then(values => {
      updateStatus('offline', values.reason)
    })
  }

  const promotionList = (hotel?.promotions || []).filter((promo) => promo && promo.title)
  const formatPeriodLabel = (periods) => {
    const list = Array.isArray(periods) ? periods : []
    if (!list.length) return t('auditDetail.promo.longTerm')
    return list.map((p) => `${dayjs(p.start).format('YYYY-MM-DD HH:mm')}~${dayjs(p.end).format('YYYY-MM-DD HH:mm')}`).join('，')
  }
  const isPeriodEffective = (periods) => {
    const list = Array.isArray(periods) ? periods : []
    if (!list.length) return true
    const now = dayjs()
    return list.some((p) => now.isAfter(dayjs(p.start)) && now.isBefore(dayjs(p.end)))
  }
  const getValueLabel = (promoValue) => {
    const val = Number(promoValue) || 0
    if (val < 0) return t('auditDetail.promo.discountAmount', { value: Math.abs(val) })
    if (val > 10) return t('auditDetail.promo.discountAmount', { value: val })
    if (val > 0) return t('auditDetail.promo.discountRate', { value: val })
    return ''
  }

  const roomColumns = [
    { title: t('auditDetail.room.name'), dataIndex: 'name', key: 'name' },
    { title: t('auditDetail.room.status'), dataIndex: 'is_active', key: 'is_active', width: 80, render: (active) => active === false ? <Tag color="default">{t('auditDetail.room.offline')}</Tag> : <Tag color="green">{t('auditDetail.room.online')}</Tag> },
    { title: t('auditDetail.room.capacity'), dataIndex: 'capacity', key: 'capacity', width: 80, render: (v) => v ? t('auditDetail.room.capacityValue', { value: v }) : '-' },
    { title: t('auditDetail.room.bedWidth'), dataIndex: 'bed_width', key: 'bed_width', width: 80, render: (v) => v ? t('auditDetail.room.bedWidthValue', { value: v }) : '-' },
    { title: t('auditDetail.room.area'), dataIndex: 'area', key: 'area', width: 80, render: (v) => v ? t('auditDetail.room.areaValue', { value: v }) : '-' },
    { title: t('auditDetail.room.ceiling'), dataIndex: 'ceiling_height', key: 'ceiling_height', width: 80, render: (v) => v ? t('auditDetail.room.ceilingValue', { value: v }) : '-' },
    { 
      title: t('auditDetail.room.price'), 
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
            <div style={{ color: '#999' }}>{t('auditDetail.room.basePrice', { value: basePrice })}</div>
            <div style={{ color: '#f5222d', fontWeight: 600 }}>{t('auditDetail.room.currentPrice', { value: discounted })}</div>
          </div>
        )
      }
    },
    {
      title: t('auditDetail.room.discount'),
      key: 'discount',
      render: (_, record) => {
        const tags = []
        const discountRate = Number(record.discount_rate) || 0
        const discountQuota = Number(record.discount_quota) || 0
        if (discountQuota > 0 && ((discountRate > 0 && discountRate <= 10) || discountRate < 0)) {
          tags.push(
            <Tag color="purple" key={`batch-${record.id || record.name}`}>
              {discountRate > 0
                ? t('auditDetail.room.batchDiscountRate', { rate: discountRate, quota: discountQuota, period: formatPeriodLabel(record.discount_periods) })
                : t('auditDetail.room.batchDiscountAmount', { value: Math.abs(discountRate), quota: discountQuota, period: formatPeriodLabel(record.discount_periods) })}
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
            <Tag color="orange" key={`promo-${index}`}>
              {promo.title || promo.type || t('auditDetail.room.promoFallback')}
            </Tag>
          )
        })
        return <Space wrap>{tags}</Space>
      }
    },
    { title: t('auditDetail.room.stock'), dataIndex: 'stock', key: 'stock', render: (v) => v || 0 },
    { title: t('auditDetail.room.wifi'), dataIndex: 'wifi', key: 'wifi', width: 70, render: (v) => v === true ? t('common.yes') : v === false ? t('common.no') : '-' },
    { title: t('auditDetail.room.breakfast'), dataIndex: 'breakfast_included', key: 'breakfast_included', width: 70, render: (v) => v === true ? t('common.yes') : v === false ? t('common.no') : '-' }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <Spin size="large" />
        </div>
      ) : !hotel ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 100 }}>
          <Empty description={t('auditDetail.emptyHotel')} />
          <GlassButton style={{ marginTop: 16 }} onClick={() => navigate('/audit')}>{t('common.backToList')}</GlassButton>
        </div>
      ) : (
        <>
          <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <GlassButton icon={<ArrowLeftOutlined />} onClick={() => navigate('/audit')}>{t('common.backToList')}</GlassButton>
            <Typography.Title level={4} style={{ margin: 0 }}>{hotel.name}</Typography.Title>
            <Tag color={statusMap[hotel.status]?.color} style={{ marginLeft: 8 }}>
              {statusMap[hotel.status]?.label}
            </Tag>
          </Space>
          <Space>
            {hotel.status === 'pending' && (
              <>
                <GlassButton 
                  type="primary" 
                  icon={<CheckCircleOutlined />}
                  onClick={() => updateStatus('approved')}
                  loading={actionLoading}
                >
                  {t('auditDetail.action.approve')}
                </GlassButton>
                <GlassButton 
                  danger 
                  icon={<CloseCircleOutlined />}
                  onClick={() => setRejecting(true)}
                >
                  {t('auditDetail.action.reject')}
                </GlassButton>
              </>
            )}
            {hotel.status === 'approved' && (
              <GlassButton danger onClick={() => setOfflineModal(true)}>
                {t('auditDetail.action.offline')}
              </GlassButton>
            )}
            {hotel.status === 'offline' && (
              <GlassButton onClick={() => updateStatus('restore')} loading={actionLoading}>
                {t('auditDetail.action.restore')}
              </GlassButton>
            )}
          </Space>
        </div>
      </Card>

      {/* 驳回原因提示 */}
      {hotel.status === 'rejected' && hotel.reject_reason && (
        <Card style={{ background: '#fff2f0', border: '1px solid #ffccc7' }}>
          <Typography.Text type="danger" strong>
            <CloseCircleOutlined style={{ marginRight: 8 }} />
            {t('auditDetail.rejectReason')}{hotel.reject_reason}
          </Typography.Text>
        </Card>
      )}

      {/* 待审核申请提醒 */}
      {pendingRequests.length > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          title={
            <Space>
              <span>{t('auditDetail.pendingRequests', { count: pendingRequests.length })}<Badge count={pendingRequests.length} style={{ backgroundColor: '#faad14' }} /></span>
              <GlassButton size="small" onClick={() => navigate(`/requests?hotelId=${id}`)}>
                {t('auditDetail.goAudit')}
              </GlassButton>
            </Space>
          }
          description={
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {pendingRequests.map((req, idx) => (
                <Tag key={idx} color="orange">
                  [{requestTypeMap[req.type] || req.type}] {req.name || req.title || req.content}
                </Tag>
              ))}
            </div>
          }
        />
      )}

      <Row gutter={24}>
        {/* 左侧：图片和基本信息 */}
        <Col span={16}>
          {/* 图片展示 */}
          <Card title={<><PictureOutlined /> {t('auditDetail.sections.images')}</>} style={{ marginBottom: 24 }}>
            {hotel.images && hotel.images.length > 0 ? (
              <Image.PreviewGroup>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {hotel.images.map((img, idx) => (
                    <Image
                      key={idx}
                      src={img}
                      alt={`${hotel.name} - ${idx + 1}`}
                      width={150}
                      height={100}
                      style={{ objectFit: 'cover', borderRadius: 8 }}
                    />
                  ))}
                </div>
              </Image.PreviewGroup>
            ) : (
              <Empty description={t('auditDetail.emptyImages')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>

          {/* 基本信息 */}
          <Card title={t('auditDetail.sections.basic')} style={{ marginBottom: 24 }}>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label={t('auditDetail.basic.name')}>{hotel.name}</Descriptions.Item>
              <Descriptions.Item label={t('auditDetail.basic.nameEn')}>{hotel.name_en || '-'}</Descriptions.Item>
              <Descriptions.Item label={<><EnvironmentOutlined /> {t('auditDetail.basic.city')}</>}>{hotel.city}</Descriptions.Item>
              <Descriptions.Item label={<><StarFilled style={{ color: '#faad14' }} /> {t('auditDetail.basic.star')}</>}>
                {hotel.star_rating ? t('auditDetail.basic.starValue', { value: hotel.star_rating }) : t('auditDetail.basic.unrated')}
              </Descriptions.Item>
              <Descriptions.Item label={t('auditDetail.basic.address')} span={2}>{hotel.address}</Descriptions.Item>
              <Descriptions.Item label={<><CalendarOutlined /> {t('auditDetail.basic.openingTime')}</>}>
                {hotel.opening_time || t('common.notFilled')}
              </Descriptions.Item>
              <Descriptions.Item label={t('auditDetail.basic.createdAt')}>
                {hotel.created_at ? new Date(hotel.created_at).toLocaleString() : '-'}
              </Descriptions.Item>
            </Descriptions>
            {hotel.description && (
              <>
                <Divider titlePlacement="left" style={{ marginTop: 16 }}>{t('auditDetail.basic.description')}</Divider>
                <Typography.Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {hotel.description}
                </Typography.Paragraph>
              </>
            )}
          </Card>

          {/* 房型信息 */}
          <Card title={<><HomeOutlined /> {t('auditDetail.sections.rooms')}</>} style={{ marginBottom: 24 }}>
            {hotel.roomTypes && hotel.roomTypes.length > 0 ? (
              <Table 
                columns={roomColumns} 
                dataSource={hotel.roomTypes} 
                rowKey={(record) => record.name || record.id}
                pagination={false}
                size="small"
              />
            ) : (
              <Empty description={t('auditDetail.emptyRooms')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>

          <Card title={<><GiftOutlined /> {t('auditDetail.sections.promotions')}</>}>
            {promotionList.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {promotionList.map((promo, idx) => {
                  const effective = isPeriodEffective(promo.periods)
                  const valText = getValueLabel(promo.value)
                  const periodText = formatPeriodLabel(promo.periods)
                  return (
                    <div key={idx} style={{ 
                      padding: '12px 16px', 
                      background: effective ? '#fff7e6' : '#fafafa', 
                      borderRadius: 8,
                      border: effective ? '1px solid #ffe58f' : '1px solid #f0f0f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>
                        {promo.type && <Tag color="orange">{promo.type}</Tag>}
                        {promo.title}
                        {valText && <span style={{ color: '#f5222d', marginLeft: 8, fontWeight: 600 }}>{valText}</span>}
                        {periodText && <span style={{ marginLeft: 8, color: '#999' }}>{periodText}</span>}
                      </span>
                      <Tag color={effective ? 'green' : 'default'}>{effective ? t('auditDetail.promo.active') : t('auditDetail.promo.inactive')}</Tag>
                    </div>
                  )
                })}
              </div>
            ) : (
              <Empty description={t('auditDetail.emptyPromotions')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>

        {/* 右侧：设施和周边 */}
        <Col span={8}>
          {/* 商户信息 */}
          <Card title={t('auditDetail.sections.merchant')} style={{ marginBottom: 24 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label={t('auditDetail.merchant.id')}>{hotel.merchant_id}</Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 设施服务 */}
          <Card title={<><AppstoreOutlined /> {t('auditDetail.sections.facilities')}</>} style={{ marginBottom: 24 }}>
            {hotel.facilities && hotel.facilities.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {hotel.facilities.map((item, idx) => (
                  <Tag key={idx} color="blue">{item}</Tag>
                ))}
              </div>
            ) : (
              <Empty description={t('auditDetail.emptyFacilities')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>

          {/* 周边景点 */}
          <Card title={<><CompassOutlined /> {t('auditDetail.sections.attractions')}</>} style={{ marginBottom: 24 }}>
            {hotel.nearby_attractions && hotel.nearby_attractions.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {hotel.nearby_attractions.map((item, idx) => (
                  <Tag key={idx} color="green">{item}</Tag>
                ))}
              </div>
            ) : (
              <Typography.Text type="secondary">{t('common.none')}</Typography.Text>
            )}
          </Card>

          {/* 交通信息 */}
          <Card title={<><CarOutlined /> {t('auditDetail.sections.transport')}</>} style={{ marginBottom: 24 }}>
            {hotel.nearby_transport && hotel.nearby_transport.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {hotel.nearby_transport.map((item, idx) => (
                  <Tag key={idx} color="cyan">{item}</Tag>
                ))}
              </div>
            ) : (
              <Typography.Text type="secondary">{t('common.none')}</Typography.Text>
            )}
          </Card>

          {/* 商场信息 */}
          <Card title={<><ShopOutlined /> {t('auditDetail.sections.malls')}</>}>
            {hotel.nearby_malls && hotel.nearby_malls.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {hotel.nearby_malls.map((item, idx) => (
                  <Tag key={idx} color="purple">{item}</Tag>
                ))}
              </div>
            ) : (
              <Typography.Text type="secondary">{t('common.none')}</Typography.Text>
            )}
          </Card>
        </Col>
      </Row>
        </>
      )}

      {/* 驳回弹窗 */}
      <Modal
        title={t('auditDetail.rejectModal.title')}
        open={rejecting}
        onOk={handleReject}
        onCancel={() => { setRejecting(false); rejectForm.resetFields() }}
        okText={t('auditDetail.rejectModal.confirm')}
        okButtonProps={{ danger: true, loading: actionLoading }}
      >
        <p>{t('auditDetail.rejectModal.content', { name: hotel?.name || '' })}</p>
        <Form form={rejectForm} layout="vertical">
          <Form.Item
            name="reason"
            label={t('auditDetail.rejectModal.reason')}
            rules={[{ required: true, message: t('auditDetail.rejectModal.reasonRequired') }]}
          >
            <Input.TextArea rows={3} placeholder={t('auditDetail.rejectModal.reasonPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 下线弹窗 */}
      <Modal
        title={t('auditDetail.offlineModal.title')}
        open={offlineModal}
        onOk={handleOffline}
        onCancel={() => { setOfflineModal(false); offlineForm.resetFields() }}
        okText={t('auditDetail.offlineModal.confirm')}
        okButtonProps={{ danger: true, loading: actionLoading }}
      >
        <p>{t('auditDetail.offlineModal.content', { name: hotel?.name || '' })}</p>
        <Form form={offlineForm} layout="vertical">
          <Form.Item
            name="reason"
            label={t('auditDetail.offlineModal.reason')}
            rules={[{ required: true, message: t('auditDetail.offlineModal.reasonRequired') }]}
          >
            <Input.TextArea rows={3} placeholder={t('auditDetail.offlineModal.reasonPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
