import { Card, Table, Space, Typography, Tag, Select, Modal, Form, Input } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EyeOutlined, StarFilled } from '@ant-design/icons'
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
      <a onClick={() => navigate(`/audit/${record.id}`)}>{text}</a>
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
          <GlassButton type="link" icon={<EyeOutlined />} onClick={() => navigate(`/audit/${record.id}`)}>查看</GlassButton>
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
    </Card>
  )
}
