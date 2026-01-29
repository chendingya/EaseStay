import { Card, Typography, Tag, Descriptions, Image, Table, Space, Row, Col, Divider, Form, Input, Modal, Spin, Empty } from 'antd'
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  StarFilled, EnvironmentOutlined, CalendarOutlined, CheckCircleOutlined, 
  CloseCircleOutlined, ArrowLeftOutlined, PictureOutlined, HomeOutlined,
  GiftOutlined, AppstoreOutlined, CarOutlined, ShopOutlined, CompassOutlined
} from '@ant-design/icons'
import { GlassButton, glassMessage as message } from '../components/GlassUI'

const apiBase = 'http://127.0.0.1:4100'

const statusMap = {
  pending: { color: 'orange', label: '待审核' },
  approved: { color: 'green', label: '已上架' },
  rejected: { color: 'red', label: '已驳回' },
  offline: { color: 'default', label: '已下线' }
}

export default function AuditDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [hotel, setHotel] = useState(null)
  const [rejecting, setRejecting] = useState(false)
  const [rejectForm] = Form.useForm()
  const [actionLoading, setActionLoading] = useState(false)

  const fetchHotel = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    setLoading(true)
    try {
      const response = await fetch(`${apiBase}/api/admin/hotels/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      if (!response.ok) {
        message.error(data.message || '获取酒店详情失败')
        return
      }
      setHotel(data)
    } catch {
      message.error('获取酒店详情失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHotel()
  }, [id])

  const updateStatus = async (status, rejectReason) => {
    const token = localStorage.getItem('token')
    if (!token) return
    setActionLoading(true)
    try {
      const response = await fetch(`${apiBase}/api/admin/hotels/${id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, rejectReason })
      })
      const data = await response.json()
      if (!response.ok) {
        message.error(data.message || '操作失败')
        return
      }
      message.success(status === 'approved' ? '审核通过，已通知商户' : status === 'rejected' ? '已驳回，已通知商户' : '操作成功')
      setRejecting(false)
      rejectForm.resetFields()
      fetchHotel()
    } catch {
      message.error('操作失败')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = () => {
    rejectForm.validateFields().then(values => {
      updateStatus('rejected', values.reason)
    })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!hotel) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 100 }}>
        <Empty description="酒店不存在" />
        <GlassButton style={{ marginTop: 16 }} onClick={() => navigate('/audit')}>返回列表</GlassButton>
      </div>
    )
  }

  const roomColumns = [
    { title: '房型名称', dataIndex: 'name', key: 'name' },
    { 
      title: '价格', 
      dataIndex: 'price', 
      key: 'price',
      render: (v) => <span style={{ color: '#f5222d', fontWeight: 600 }}>¥{v || 0}</span>
    },
    { title: '库存', dataIndex: 'stock', key: 'stock', render: (v) => v || 0 }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 顶部操作栏 */}
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
              <GlassButton onClick={() => updateStatus('offline')} loading={actionLoading}>
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
                <Divider orientation="left" style={{ marginTop: 16 }}>酒店描述</Divider>
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
                rowKey={(_, idx) => idx}
                pagination={false}
                size="small"
              />
            ) : (
              <Empty description="暂无房型信息" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>

          {/* 优惠活动 */}
          <Card title={<><GiftOutlined /> 优惠活动</>}>
            {hotel.promotions && hotel.promotions.filter(p => p && p.title).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {hotel.promotions.filter(p => p && p.title).map((promo, idx) => (
                  <div key={idx} style={{ 
                    padding: '12px 16px', 
                    background: '#fff7e6', 
                    borderRadius: 8,
                    border: '1px solid #ffe58f',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>
                      {promo.type && <Tag color="orange">{promo.type}</Tag>}
                      {promo.title}
                    </span>
                    {promo.value && <span style={{ color: '#f5222d', fontWeight: 600 }}>{promo.value}折</span>}
                  </div>
                ))}
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

      {/* 驳回弹窗 */}
      <Modal
        title="驳回酒店"
        open={rejecting}
        onOk={handleReject}
        onCancel={() => { setRejecting(false); rejectForm.resetFields() }}
        okText="确认驳回"
        okButtonProps={{ danger: true, loading: actionLoading }}
      >
        <p>确定要驳回酒店「{hotel.name}」吗？驳回后将通知商户。</p>
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
    </div>
  )
}
