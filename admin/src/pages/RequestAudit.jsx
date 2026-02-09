import { Card, Table, Typography, Tag, Modal, Form, Input, Tabs, Descriptions, Empty, Alert, Space } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { 
  CheckCircleOutlined, CloseCircleOutlined, ShopOutlined, 
  AppstoreOutlined, HomeOutlined, GiftOutlined, ArrowLeftOutlined, DeleteOutlined
} from '@ant-design/icons'
import { GlassButton, glassMessage as message } from '../components'
import { api } from '../services'

const typeMap = {
  facility: { label: '设施申请', icon: <AppstoreOutlined />, color: 'blue' },
  room_type: { label: '房型申请', icon: <HomeOutlined />, color: 'purple' },
  promotion: { label: '优惠申请', icon: <GiftOutlined />, color: 'orange' },
  hotel_delete: { label: '删除酒店申请', icon: <DeleteOutlined />, color: 'red' }
}

const statusMap = {
  pending: { color: 'orange', label: '待审核' },
  approved: { color: 'green', label: '已通过' },
  rejected: { color: 'red', label: '已拒绝' }
}

export default function RequestAudit() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const hotelIdFilter = searchParams.get('hotelId')
  
  const [loading, setLoading] = useState(false)
  const [requests, setRequests] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [rejecting, setRejecting] = useState(null)
  const [rejectForm] = Form.useForm()
  const [detailModal, setDetailModal] = useState(null)

  const fetchRequests = useCallback(async (type) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (type && type !== 'all') params.append('type', type)
      if (hotelIdFilter) params.append('hotelId', hotelIdFilter)
      const query = params.toString() ? `?${params.toString()}` : ''
      const data = await api.get(`/api/admin/requests${query}`)
      setRequests(data)
    } catch (error) {
      console.error('获取申请列表失败:', error)
    } finally {
      setLoading(false)
    }
  }, [hotelIdFilter])

  useEffect(() => {
    fetchRequests(activeTab)
  }, [activeTab, fetchRequests])

  const handleReview = async (id, action, rejectReason) => {
    setLoading(true)
    try {
      await api.put(`/api/admin/requests/${id}/review`, { action, rejectReason })
      message.success(action === 'approve' ? '已通过申请并通知商户' : '已拒绝申请并通知商户')
      setRejecting(null)
      rejectForm.resetFields()
      fetchRequests(activeTab)
    } catch (error) {
      console.error('审核申请失败:', error)
      message.error('审核失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = () => {
    rejectForm.validateFields().then(values => {
      handleReview(rejecting.id, 'reject', values.reason)
    })
  }

  const renderDataDetail = (record) => {
    if (!record) return null
    const { type, name, data } = record

    if (type === 'facility') {
      return (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="设施名称">{name}</Descriptions.Item>
          <Descriptions.Item label="申请说明">{data?.description || '无'}</Descriptions.Item>
        </Descriptions>
      )
    }

    if (type === 'room_type') {
      return (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="房型名称">{name}</Descriptions.Item>
          <Descriptions.Item label="价格">¥{data?.price || 0}/晚</Descriptions.Item>
          <Descriptions.Item label="库存">{data?.stock || 0} 间</Descriptions.Item>
        </Descriptions>
      )
    }

    if (type === 'promotion') {
      return (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="优惠标题">{name}</Descriptions.Item>
          <Descriptions.Item label="优惠类型">{data?.type || '通用'}</Descriptions.Item>
          <Descriptions.Item label="折扣">{data?.value ? `${data.value}折` : '无'}</Descriptions.Item>
        </Descriptions>
      )
    }
    if (type === 'hotel_delete') {
      return (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="酒店名称">{name || data?.hotelName || '-'}</Descriptions.Item>
          <Descriptions.Item label="处理说明">审核通过后将永久删除酒店及相关数据</Descriptions.Item>
        </Descriptions>
      )
    }

    return null
  }

  const columns = [
    {
      title: '类型',
      dataIndex: 'type',
      width: 120,
      render: (type) => {
        const info = typeMap[type] || { label: type, color: 'default' }
        return <Tag icon={info.icon} color={info.color}>{info.label}</Tag>
      }
    },
    { 
      title: '申请名称', 
      dataIndex: 'name',
      render: (text, record) => (
        <a onClick={() => setDetailModal(record)}>{text}</a>
      )
    },
    { 
      title: '关联酒店', 
      dataIndex: 'hotels',
      render: (hotel) => hotel?.name || '-'
    },
    { 
      title: '商户', 
      dataIndex: 'users',
      render: (user) => user?.username || '-'
    },
    { 
      title: '申请时间', 
      dataIndex: 'created_at', 
      width: 120,
      render: v => v ? v.split('T')[0] : '-' 
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value) => {
        const info = statusMap[value] || { color: 'default', label: value }
        return <Tag color={info.color}>{info.label}</Tag>
      }
    },
    {
      title: '操作',
      width: 200,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 8 }}>
          {record.status === 'pending' && (
            <>
              <GlassButton 
                type="primary" 
                size="small" 
                icon={<CheckCircleOutlined />}
                onClick={() => handleReview(record.id, 'approve')}
              >
                通过
              </GlassButton>
              <GlassButton 
                danger 
                size="small" 
                icon={<CloseCircleOutlined />}
                onClick={() => setRejecting(record)}
              >
                拒绝
              </GlassButton>
            </>
          )}
          <GlassButton type="link" size="small" onClick={() => setDetailModal(record)}>
            详情
          </GlassButton>
        </div>
      )
    }
  ]

  const tabItems = [
    { key: 'all', label: '全部申请' },
    { key: 'facility', label: '设施申请' },
    { key: 'room_type', label: '房型申请' },
    { key: 'promotion', label: '优惠申请' },
    { key: 'hotel_delete', label: '删除酒店申请' }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 24 }}>
      <Space>
        {hotelIdFilter && (
          <GlassButton icon={<ArrowLeftOutlined />} onClick={() => navigate(`/audit/${hotelIdFilter}`)}>
            返回酒店审核
          </GlassButton>
        )}
        <Typography.Title level={4} style={{ margin: 0 }}>
          <ShopOutlined /> 申请审核
        </Typography.Title>
      </Space>

      {hotelIdFilter && (
        <Alert
          type="info"
          showIcon
          title={
            <Space>
              <span>当前仅显示该酒店的待审核申请</span>
              <GlassButton size="small" onClick={() => setSearchParams({})}>
                查看全部申请
              </GlassButton>
            </Space>
          }
        />
      )}

      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={tabItems}
          style={{ marginBottom: 16 }}
        />
        <Table
          columns={columns}
          dataSource={requests}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: <Empty description="暂无待审核的申请" /> }}
        />
      </Card>

      {/* 拒绝原因弹窗 */}
      <Modal
        title="拒绝申请"
        open={!!rejecting}
        onOk={handleReject}
        onCancel={() => { setRejecting(null); rejectForm.resetFields() }}
        okText="确认拒绝"
        okButtonProps={{ danger: true }}
      >
        <p>确定要拒绝「{rejecting?.name}」的申请吗？</p>
        <Form form={rejectForm} layout="vertical">
          <Form.Item
            name="reason"
            label="拒绝原因"
            rules={[{ required: true, message: '请输入拒绝原因' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入拒绝原因，将发送给商户" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title={
          <span>
            {typeMap[detailModal?.type]?.icon} {typeMap[detailModal?.type]?.label || '申请'} - {detailModal?.name}
          </span>
        }
        open={!!detailModal}
        onCancel={() => setDetailModal(null)}
        footer={
          detailModal?.status === 'pending' ? (
            <Space>
              <GlassButton danger onClick={() => { setDetailModal(null); setRejecting(detailModal) }}>
                拒绝
              </GlassButton>
              <GlassButton type="primary" onClick={() => { handleReview(detailModal.id, 'approve'); setDetailModal(null) }}>
                通过
              </GlassButton>
            </Space>
          ) : (
            <GlassButton onClick={() => setDetailModal(null)}>关闭</GlassButton>
          )
        }
        width={500}
      >
        {detailModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="商户">{detailModal.users?.username || '-'}</Descriptions.Item>
              <Descriptions.Item label="关联酒店">{detailModal.hotels?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="申请时间">
                {detailModal.created_at ? new Date(detailModal.created_at).toLocaleString() : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusMap[detailModal.status]?.color}>
                  {statusMap[detailModal.status]?.label}
                </Tag>
              </Descriptions.Item>
              {detailModal.status === 'rejected' && detailModal.reject_reason && (
                <Descriptions.Item label="拒绝原因">
                  <span style={{ color: '#f5222d' }}>{detailModal.reject_reason}</span>
                </Descriptions.Item>
              )}
            </Descriptions>

            <Card size="small" title="申请内容">
              {renderDataDetail(detailModal)}
            </Card>

            {detailModal.status === 'pending' && (
              <div style={{ 
                padding: 12, 
                background: '#fffbe6', 
                borderRadius: 8, 
                border: '1px solid #ffe58f' 
              }}>
                <Typography.Text type="warning">
                  提示：审核通过后，该内容将自动添加到对应酒店；审核拒绝后，将通知商户并说明拒绝原因。
                </Typography.Text>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
