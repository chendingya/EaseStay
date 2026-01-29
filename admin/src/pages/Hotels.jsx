import { Card, Table, Tag, Button, Space, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { glassMessage as message } from '../components/GlassUI'

const apiBase = 'http://127.0.0.1:4100'

const statusMap = {
  pending: { color: 'orange', label: '待审核' },
  approved: { color: 'green', label: '已上架' },
  rejected: { color: 'red', label: '已驳回' },
  offline: { color: 'default', label: '已下线' }
}

export default function Hotels() {
  const navigate = useNavigate()
  const [hotels, setHotels] = useState([])
  const [loading, setLoading] = useState(false)
  const role = localStorage.getItem('role')

  const fetchHotels = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    setLoading(true)
    try {
      const response = await fetch(`${apiBase}/api/merchant/hotels`, {
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
    if (role === 'merchant') {
      fetchHotels()
    }
  }, [role])

  const columns = [
    { title: '酒店名称', dataIndex: 'name' },
    { title: '英文名', dataIndex: 'name_en' },
    { title: '城市', dataIndex: 'city' },
    { title: '星级', dataIndex: 'star_rating' },
    { title: '最低价', dataIndex: 'lowestPrice', render: (v) => v ? `¥${v}` : '-' },
    { title: '开业时间', dataIndex: 'opening_time' },
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
          {record.status === 'approved' && (
            <Button type="link" onClick={() => navigate(`/hotels/${record.id}`)}>查看</Button>
          )}
          <Button type="link" onClick={() => navigate(`/hotels/edit/${record.id}`)}>编辑</Button>
        </Space>
      )
    }
  ]

  return (
    <Card
      title={<Typography.Title level={5} style={{ margin: 0 }}>酒店管理</Typography.Title>}
      extra={<Button type="primary" onClick={() => navigate('/hotels/new')}>新增酒店</Button>}
    >
      <Table
        columns={columns}
        dataSource={hotels}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 8 }}
      />
    </Card>
  )
}
