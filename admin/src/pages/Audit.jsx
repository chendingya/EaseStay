import { Card, Table, Space, Typography, Tag, Select, Modal, Form, Input, Descriptions, Image, Drawer } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EyeOutlined, StarFilled, EnvironmentOutlined } from '@ant-design/icons'
import { GlassButton, glassMessage as message } from '../components/GlassUI'

const apiBase = 'http://127.0.0.1:4100'

const statusMap = {
  pending: { color: 'orange', label: '待审核' },
  approved: { color: 'green', label: '已上架' },
  rejected: { color: 'red', label: '已驳回' },
  offline: { color: 'default', label: '已下线' }
}

export default function Audit() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [hotels, setHotels] = useState([])
  const [statusFilter, setStatusFilter] = useState('pending')
  const [rejecting, setRejecting] = useState(null)
  const [rejectForm] = Form.useForm()
  const [detailDrawer, setDetailDrawer] = useState(null)

  const fetchHotels = async (statusValue) => {
    const token = localStorage.getItem('token')
    if (!token) return
    setLoading(true)
    try {
      const query = statusValue && statusValue !== 'all' ? `?status=${statusValue}` : ''
      const response = await fetch(`${apiBase}/api/admin/hotels${query}`, {
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
    fetchHotels(statusFilter)
  }, [statusFilter])

  const updateStatus = async (id, status, rejectReason) => {
    const token = localStorage.getItem('token')
    if (!token) return
    setLoading(true)
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
      message.success('操作成功')
      fetchHotels(statusFilter)
    } catch {
      message.error('操作失败')
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    { title: '酒店名称', dataIndex: 'name', render: (text, record) => (
      <a onClick={() => setDetailDrawer(record)}>{text}</a>
    )},
    { title: '城市', dataIndex: 'city' },
    { title: '星级', dataIndex: 'star_rating', render: v => v ? <span><StarFilled style={{ color: '#faad14' }} /> {v}星</span> : '-' },
    { title: '最低价', dataIndex: 'lowestPrice', render: v => v ? <span style={{ color: '#f5222d' }}>¥{v}</span> : '-' },
    { title: '提交时间', dataIndex: 'created_at', render: v => v ? v.split('T')[0] : '-' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (value) => {
        const info = statusMap[value] || { color: 'default', label: value }
        return <Tag color={info.color}>{info.label}</Tag>
      }
    },
    {
      title: '操作',
      render: (_, record) => (
        <Space>
          <GlassButton type="link" icon={<EyeOutlined />} onClick={() => setDetailDrawer(record)}>查看</GlassButton>
          {record.status === 'pending' ? (
            <>
              <GlassButton type="primary" size="small" onClick={() => updateStatus(record.id, 'approved')}>通过</GlassButton>
              <GlassButton danger size="small" onClick={() => {
                setRejecting(record)
                rejectForm.resetFields()
              }}>驳回</GlassButton>
            </>
          ) : null}
          {record.status === 'approved' ? (
            <GlassButton size="small" onClick={() => updateStatus(record.id, 'offline')}>下线</GlassButton>
          ) : null}
          {record.status === 'offline' ? (
            <GlassButton size="small" onClick={() => updateStatus(record.id, 'restore')}>恢复</GlassButton>
          ) : null}
        </Space>
      )
    }
  ]

  return (
    <Card
      title={<Typography.Title level={5} style={{ margin: 0 }}>审核列表</Typography.Title>}
      extra={(
        <Select
          value={statusFilter}
          style={{ width: 160 }}
          onChange={setStatusFilter}
          options={[
            { value: 'all', label: '全部状态' },
            { value: 'pending', label: '待审核' },
            { value: 'approved', label: '已上架' },
            { value: 'rejected', label: '已驳回' },
            { value: 'offline', label: '已下线' }
          ]}
        />
      )}
    >
      <Table columns={columns} dataSource={hotels} rowKey="id" loading={loading} pagination={{ pageSize: 8 }} />
      <Modal
        title="驳回原因"
        open={!!rejecting}
        onCancel={() => setRejecting(null)}
        onOk={async () => {
          const values = await rejectForm.validateFields()
          updateStatus(rejecting.id, 'rejected', values.rejectReason)
          setRejecting(null)
        }}
        okText="确认驳回"
      >
        <Form layout="vertical" form={rejectForm}>
          <Form.Item name="rejectReason" label="原因" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="请输入驳回原因" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 酒店详情 Drawer */}
      <Drawer
        title={detailDrawer?.name || '酒店详情'}
        placement="right"
        size="large"
        onClose={() => setDetailDrawer(null)}
        open={!!detailDrawer}
        extra={
          <Tag color={statusMap[detailDrawer?.status]?.color}>
            {statusMap[detailDrawer?.status]?.label}
          </Tag>
        }
      >
        {detailDrawer && (
          <Space style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 16 }}>
            {/* 图片 */}
            {detailDrawer.images && detailDrawer.images.length > 0 && (
              <Image
                src={detailDrawer.images[0]}
                alt={detailDrawer.name}
                width="100%"
                height={180}
                style={{ objectFit: 'cover', borderRadius: 8 }}
              />
            )}

            {/* 基本信息 */}
            <Card title="基本信息">
              <Descriptions column={1} size="small">
                {detailDrawer.name_en && (
                  <Descriptions.Item label="英文名">{detailDrawer.name_en}</Descriptions.Item>
                )}
                <Descriptions.Item label={<><EnvironmentOutlined /> 城市</>}>{detailDrawer.city}</Descriptions.Item>
                <Descriptions.Item label="地址">{detailDrawer.address}</Descriptions.Item>
                <Descriptions.Item label={<><StarFilled style={{ color: '#faad14' }} /> 星级</>}>
                  {detailDrawer.star_rating ? `${detailDrawer.star_rating} 星级` : '未评级'}
                </Descriptions.Item>
                <Descriptions.Item label="开业时间">{detailDrawer.opening_time || '未填写'}</Descriptions.Item>
              </Descriptions>
              {detailDrawer.description && (
                <Typography.Paragraph style={{ marginTop: 8, marginBottom: 0 }} type="secondary">
                  {detailDrawer.description}
                </Typography.Paragraph>
              )}
            </Card>

            {/* 设施标签 */}
            {detailDrawer.facilities && detailDrawer.facilities.length > 0 && (
              <Card title="设施服务">
                <Space wrap>
                  {detailDrawer.facilities.map((item, index) => (
                    <Tag key={index} color="blue">{item}</Tag>
                  ))}
                </Space>
              </Card>
            )}

            {/* 房型信息 */}
            {detailDrawer.roomTypes && detailDrawer.roomTypes.length > 0 && (
              <Card title="房型信息">
                {detailDrawer.roomTypes.map((room, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: index < detailDrawer.roomTypes.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                    <span>{room.name}</span>
                    <span style={{ color: '#f5222d', fontWeight: 600 }}>¥{room.price}</span>
                  </div>
                ))}
              </Card>
            )}

            {/* 驳回原因 */}
            {detailDrawer.status === 'rejected' && detailDrawer.reject_reason && (
              <Card title="驳回原因">
                <Typography.Text type="danger">{detailDrawer.reject_reason}</Typography.Text>
              </Card>
            )}

            {/* 操作按钮 */}
            {detailDrawer.status === 'pending' && (
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <GlassButton type="primary" onClick={() => {
                  updateStatus(detailDrawer.id, 'approved')
                  setDetailDrawer(null)
                }}>审核通过</GlassButton>
                <GlassButton danger onClick={() => {
                  setRejecting(detailDrawer)
                  rejectForm.resetFields()
                  setDetailDrawer(null)
                }}>驳回</GlassButton>
              </Space>
            )}
          </Space>
        )}
      </Drawer>
    </Card>
  )
}
