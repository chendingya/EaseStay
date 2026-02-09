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

const statusMap = {
  pending: { color: 'orange', label: '待审核' },
  approved: { color: 'green', label: '已上架' },
  rejected: { color: 'red', label: '已驳回' },
  offline: { color: 'default', label: '已下线' }
}

const requestTypeMap = {
  facility: '设施',
  room_type: '房型',
  promotion: '优惠',
  hotel_delete: '酒店删除'
}

export default function AuditDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [hotel, setHotel] = useState(null)
  const [pendingRequests, setPendingRequests] = useState([])
  const [rejecting, setRejecting] = useState(false)
  const [offlineModal, setOfflineModal] = useState(false)
  const [rejectForm] = Form.useForm()
  const [offlineForm] = Form.useForm()
  const [actionLoading, setActionLoading] = useState(false)

  const fetchHotel = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get(`/api/admin/hotels/${id}`)
      setHotel(data)
    } catch (error) {
      console.error('获取酒店详情失败:', error)
      message.error('获取酒店详情失败')
    } finally {
      setLoading(false)
    }
  }, [id])

  const fetchPendingRequests = useCallback(async () => {
    try {
      const data = await api.get(`/api/admin/requests?hotelId=${id}`)
      if (Array.isArray(data)) {
        setPendingRequests(data)
      }
    } catch (error) {
      console.error('获取待审核申请失败:', error)
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
        status === 'approved' ? '审核通过，已通知商户' 
        : status === 'rejected' ? '已驳回，已通知商户' 
        : status === 'offline' ? '已下线，已通知商户'
        : '操作成功'
      )
      window.dispatchEvent(new Event('admin-pending-update'))
      setRejecting(false)
      setOfflineModal(false)
      rejectForm.resetFields()
      offlineForm.resetFields()
      fetchHotel()
    } catch (error) {
      console.error('更新酒店状态失败:', error)
      message.error('操作失败，请重试')
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
    if (!list.length) return '长期'
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
    if (val < 0) return `减免 ${Math.abs(val)} 元`
    if (val > 10) return `减免 ${val} 元`
    if (val > 0) return `${val} 折`
    return ''
  }

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
            <Tag color="orange" key={`promo-${index}`}>
              {promo.title || promo.type || '优惠'}
            </Tag>
          )
        })
        return <Space wrap>{tags}</Space>
      }
    },
    { title: '库存', dataIndex: 'stock', key: 'stock', render: (v) => v || 0 },
    { title: 'WiFi', dataIndex: 'wifi', key: 'wifi', width: 70, render: (v) => v === true ? '有' : v === false ? '无' : '-' },
    { title: '含早', dataIndex: 'breakfast_included', key: 'breakfast_included', width: 70, render: (v) => v === true ? '是' : v === false ? '否' : '-' }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <Spin size="large" />
        </div>
      ) : !hotel ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 100 }}>
          <Empty description="酒店不存在" />
          <GlassButton style={{ marginTop: 16 }} onClick={() => navigate('/audit')}>返回列表</GlassButton>
        </div>
      ) : (
        <>
          <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <GlassButton icon={<ArrowLeftOutlined />} onClick={() => navigate('/audit')}>返回列表</GlassButton>
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
                  审核通过
                </GlassButton>
                <GlassButton 
                  danger 
                  icon={<CloseCircleOutlined />}
                  onClick={() => setRejecting(true)}
                >
                  驳回
                </GlassButton>
              </>
            )}
            {hotel.status === 'approved' && (
              <GlassButton danger onClick={() => setOfflineModal(true)}>
                下线酒店
              </GlassButton>
            )}
            {hotel.status === 'offline' && (
              <GlassButton onClick={() => updateStatus('restore')} loading={actionLoading}>
                恢复上架
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
            驳回原因：{hotel.reject_reason}
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
              <span>该酒店有 <Badge count={pendingRequests.length} style={{ backgroundColor: '#faad14' }} /> 个待审核的申请</span>
              <GlassButton size="small" onClick={() => navigate(`/requests?hotelId=${id}`)}>
                前往审核
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
          <Card title={<><PictureOutlined /> 酒店图片</>} style={{ marginBottom: 24 }}>
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
              <Empty description="暂无图片" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>

          {/* 基本信息 */}
          <Card title="基本信息" style={{ marginBottom: 24 }}>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="酒店名称">{hotel.name}</Descriptions.Item>
              <Descriptions.Item label="英文名">{hotel.name_en || '-'}</Descriptions.Item>
              <Descriptions.Item label={<><EnvironmentOutlined /> 城市</>}>{hotel.city}</Descriptions.Item>
              <Descriptions.Item label={<><StarFilled style={{ color: '#faad14' }} /> 星级</>}>
                {hotel.star_rating ? `${hotel.star_rating} 星级` : '未评级'}
              </Descriptions.Item>
              <Descriptions.Item label="详细地址" span={2}>{hotel.address}</Descriptions.Item>
              <Descriptions.Item label={<><CalendarOutlined /> 开业时间</>}>
                {hotel.opening_time || '未填写'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {hotel.created_at ? new Date(hotel.created_at).toLocaleString() : '-'}
              </Descriptions.Item>
            </Descriptions>
            {hotel.description && (
              <>
                <Divider titlePlacement="left" style={{ marginTop: 16 }}>酒店描述</Divider>
                <Typography.Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {hotel.description}
                </Typography.Paragraph>
              </>
            )}
          </Card>

          {/* 房型信息 */}
          <Card title={<><HomeOutlined /> 房型信息</>} style={{ marginBottom: 24 }}>
            {hotel.roomTypes && hotel.roomTypes.length > 0 ? (
              <Table 
                columns={roomColumns} 
                dataSource={hotel.roomTypes} 
                rowKey={(record) => record.name || record.id}
                pagination={false}
                size="small"
              />
            ) : (
              <Empty description="暂无房型信息" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>

          <Card title={<><GiftOutlined /> 优惠活动</>}>
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
                      <Tag color={effective ? 'green' : 'default'}>{effective ? '当前生效' : '未生效'}</Tag>
                    </div>
                  )
                })}
              </div>
            ) : (
              <Empty description="暂无优惠活动" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>

        {/* 右侧：设施和周边 */}
        <Col span={8}>
          {/* 商户信息 */}
          <Card title="商户信息" style={{ marginBottom: 24 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="商户ID">{hotel.merchant_id}</Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 设施服务 */}
          <Card title={<><AppstoreOutlined /> 设施服务</>} style={{ marginBottom: 24 }}>
            {hotel.facilities && hotel.facilities.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {hotel.facilities.map((item, idx) => (
                  <Tag key={idx} color="blue">{item}</Tag>
                ))}
              </div>
            ) : (
              <Empty description="暂无设施信息" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>

          {/* 周边景点 */}
          <Card title={<><CompassOutlined /> 周边景点</>} style={{ marginBottom: 24 }}>
            {hotel.nearby_attractions && hotel.nearby_attractions.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {hotel.nearby_attractions.map((item, idx) => (
                  <Tag key={idx} color="green">{item}</Tag>
                ))}
              </div>
            ) : (
              <Typography.Text type="secondary">暂无</Typography.Text>
            )}
          </Card>

          {/* 交通信息 */}
          <Card title={<><CarOutlined /> 交通信息</>} style={{ marginBottom: 24 }}>
            {hotel.nearby_transport && hotel.nearby_transport.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {hotel.nearby_transport.map((item, idx) => (
                  <Tag key={idx} color="cyan">{item}</Tag>
                ))}
              </div>
            ) : (
              <Typography.Text type="secondary">暂无</Typography.Text>
            )}
          </Card>

          {/* 商场信息 */}
          <Card title={<><ShopOutlined /> 周边商场</>}>
            {hotel.nearby_malls && hotel.nearby_malls.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {hotel.nearby_malls.map((item, idx) => (
                  <Tag key={idx} color="purple">{item}</Tag>
                ))}
              </div>
            ) : (
              <Typography.Text type="secondary">暂无</Typography.Text>
            )}
          </Card>
        </Col>
      </Row>
        </>
      )}

      {/* 驳回弹窗 */}
      <Modal
        title="驳回酒店"
        open={rejecting}
        onOk={handleReject}
        onCancel={() => { setRejecting(false); rejectForm.resetFields() }}
        okText="确认驳回"
        okButtonProps={{ danger: true, loading: actionLoading }}
      >
        <p>确定要驳回酒店「{hotel?.name || ''}」吗？驳回后将通知商户。</p>
        <Form form={rejectForm} layout="vertical">
          <Form.Item
            name="reason"
            label="驳回原因"
            rules={[{ required: true, message: '请输入驳回原因' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入驳回原因，将发送给商户" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 下线弹窗 */}
      <Modal
        title="下线酒店"
        open={offlineModal}
        onOk={handleOffline}
        onCancel={() => { setOfflineModal(false); offlineForm.resetFields() }}
        okText="确认下线"
        okButtonProps={{ danger: true, loading: actionLoading }}
      >
        <p>确定要下线酒店「{hotel?.name || ''}」吗？下线后将通知商户。</p>
        <Form form={offlineForm} layout="vertical">
          <Form.Item
            name="reason"
            label="下线原因"
            rules={[{ required: true, message: '请输入下线原因' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入下线原因，将发送给商户" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
