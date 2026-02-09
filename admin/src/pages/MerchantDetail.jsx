import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Tag, Space, Typography, Table, Spin, Row, Col, Statistic, Modal, Form, Input } from 'antd'
import { UserOutlined, ShopOutlined, CalendarOutlined, KeyOutlined, StarFilled, EnvironmentOutlined } from '@ant-design/icons'
import { GlassButton, glassMessage as message } from '../components'
import { api } from '../services'

const statusMap = {
  pending: { color: 'orange', label: '待审核' },
  approved: { color: 'green', label: '已上架' },
  rejected: { color: 'red', label: '已驳回' },
  offline: { color: 'default', label: '已下线' }
}

export default function MerchantDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [merchant, setMerchant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [resetModal, setResetModal] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [form] = Form.useForm()

  const fetchMerchant = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get(`/api/user/merchants/${id}`)
      setMerchant(data)
    } catch (error) {
      if (error?.response?.status) {
        navigate('/merchants')
      }
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => {
    fetchMerchant()
  }, [fetchMerchant])

  const handleResetPassword = async () => {
    try {
      const values = await form.validateFields()
      if (values.newPassword !== values.confirmPassword) {
        message.error('两次输入的密码不一致')
        return
      }

      setResetting(true)
      await api.post(`/api/user/merchants/${id}/reset-password`, { newPassword: values.newPassword })
      message.success('密码重置成功')
      setResetModal(false)
      form.resetFields()
    } catch (err) {
      if (err.errorFields) return
    } finally {
      setResetting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!merchant) {
    return null
  }

  // 统计数据
  const hotels = merchant.hotels || []
  const stats = {
    total: hotels.length,
    approved: hotels.filter(h => h.status === 'approved').length,
    pending: hotels.filter(h => h.status === 'pending').length,
    offline: hotels.filter(h => h.status === 'offline').length
  }

  const hotelColumns = [
    { 
      title: '酒店名称', 
      dataIndex: 'name', 
      ellipsis: true,
      render: (text, record) => (
        <a onClick={() => navigate(`/admin-hotels/${record.id}`)}>{text}</a>
      )
    },
    { 
      title: '城市', 
      dataIndex: 'city', 
      width: 100,
      render: (v) => v ? <><EnvironmentOutlined /> {v}</> : '-'
    },
    { 
      title: '星级', 
      dataIndex: 'star_rating', 
      width: 80,
      render: v => v ? <span><StarFilled style={{ color: '#faad14' }} /> {v}星</span> : '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value) => {
        const info = statusMap[value] || { color: 'default', label: value }
        return <Tag color={info.color}>{info.label}</Tag>
      }
    },
    {
      title: '操作',
      width: 100,
      render: (_, record) => (
        <GlassButton type="link" size="small" onClick={() => navigate(`/admin-hotels/${record.id}`)}>
          查看详情
        </GlassButton>
      )
    }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 24 }}>
      {/* 页面标题 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            <UserOutlined /> {merchant.username}
          </Typography.Title>
          <Typography.Text type="secondary">商户详情</Typography.Text>
        </div>
        <Space>
          <GlassButton onClick={() => navigate('/merchants')}>返回列表</GlassButton>
          <GlassButton icon={<KeyOutlined />} onClick={() => setResetModal(true)}>
            重置密码
          </GlassButton>
        </Space>
      </div>

      {/* 酒店统计 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic title="酒店总数" value={stats.total} prefix={<ShopOutlined />} suffix="家" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="已上架" value={stats.approved} valueStyle={{ color: '#52c41a' }} suffix="家" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="待审核" value={stats.pending} valueStyle={{ color: '#faad14' }} suffix="家" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="已下线" value={stats.offline} valueStyle={{ color: '#999' }} suffix="家" />
          </Card>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col span={8}>
          {/* 基本信息 */}
          <Card title="基本信息">
            <Descriptions column={1}>
              <Descriptions.Item label={<><UserOutlined /> 商户账号</>}>
                {merchant.username}
              </Descriptions.Item>
              <Descriptions.Item label={<><CalendarOutlined /> 注册时间</>}>
                {merchant.created_at ? new Date(merchant.created_at).toLocaleDateString('zh-CN') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="商户ID">
                {merchant.id}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col span={16}>
          {/* 酒店列表 */}
          <Card title={`酒店列表 (${hotels.length})`}>
            <Table
              columns={hotelColumns}
              dataSource={hotels}
              rowKey="id"
              pagination={{ pageSize: 5, showSizeChanger: false }}
              locale={{ emptyText: '该商户暂无酒店' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 重置密码弹窗 */}
      <Modal
        title={`重置密码 - ${merchant.username}`}
        open={resetModal}
        onCancel={() => {
          setResetModal(false)
          form.resetFields()
        }}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6位' }
            ]}
          >
            <Input.Password placeholder="请输入新密码（至少6位）" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="确认密码"
            rules={[
              { required: true, message: '请再次输入密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'))
                }
              })
            ]}
          >
            <Input.Password placeholder="请再次输入密码" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <GlassButton onClick={() => {
                setResetModal(false)
                form.resetFields()
              }}>取消</GlassButton>
              <GlassButton type="primary" loading={resetting} onClick={handleResetPassword}>
                确认重置
              </GlassButton>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
