import { Card, Col, Row, Statistic, Space, Button, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ pending: 0, approved: 0, offline: 0, total: 0 })
  const [loading, setLoading] = useState(false)
  const role = localStorage.getItem('role')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    const fetchStats = async () => {
      setLoading(true)
      try {
        const url = role === 'admin'
          ? 'http://127.0.0.1:4100/api/admin/hotels'
          : 'http://127.0.0.1:4100/api/merchant/hotels'
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await response.json()
        if (!response.ok) return
        const counts = data.reduce((acc, item) => {
          acc.total += 1
          if (item.status === 'pending') acc.pending += 1
          if (item.status === 'approved') acc.approved += 1
          if (item.status === 'offline') acc.offline += 1
          return acc
        }, { pending: 0, approved: 0, offline: 0, total: 0 })
        setStats(counts)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [role])

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic title="待审核酒店" value={stats.pending} loading={loading} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="已上架酒店" value={stats.approved} loading={loading} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="酒店总数" value={stats.total} loading={loading} />
          </Card>
        </Col>
      </Row>
      <Card>
        <Typography.Title level={5}>快捷操作</Typography.Title>
        <Space>
          {role === 'merchant' ? (
            <Button type="primary" onClick={() => navigate('/hotels/new')}>新增酒店</Button>
          ) : null}
          {role === 'admin' ? (
            <Button type="primary" onClick={() => navigate('/audit')}>查看待审核</Button>
          ) : null}
        </Space>
      </Card>
    </Space>
  )
}
