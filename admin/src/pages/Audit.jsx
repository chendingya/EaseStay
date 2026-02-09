import { Card, Table, Space, Typography, Tag, Select } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EyeOutlined, StarFilled } from '@ant-design/icons'
import { GlassButton } from '../components'
import { api } from '../services'

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

  const fetchHotels = useCallback(async () => {
    setLoading(true)
    try {
      const query = statusFilter && statusFilter !== 'all' ? `?status=${statusFilter}` : ''
      const data = await api.get(`/api/admin/hotels${query}`)
      setHotels(data)
    } catch (error) {
      console.error('获取审核列表失败:', error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchHotels()
  }, [fetchHotels])

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
          <GlassButton type="link" icon={<EyeOutlined />} onClick={() => navigate(`/audit/${record.id}`)}>
            {record.status === 'pending' ? '审核' : '查看'}
          </GlassButton>
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
    </Card>
  )
}
