import { Card, Table, Space, Typography, Tag, Modal, Form, Input, Drawer, Descriptions, List } from 'antd'
import { useEffect, useState } from 'react'
import { UserOutlined, ShopOutlined, CalendarOutlined, EyeOutlined, KeyOutlined } from '@ant-design/icons'
import { GlassButton, glassMessage as message } from '../components/GlassUI'

const apiBase = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:4100'

const statusMap = {
  pending: { color: 'orange', label: '待审核' },
  approved: { color: 'green', label: '已上架' },
  rejected: { color: 'red', label: '已驳回' },
  offline: { color: 'default', label: '已下线' }
}

export default function Merchants() {
  const [loading, setLoading] = useState(false)
  const [merchants, setMerchants] = useState([])
  const [detailDrawer, setDetailDrawer] = useState(null)
  const [resetModal, setResetModal] = useState(null)
  const [form] = Form.useForm()
  const [resetting, setResetting] = useState(false)

  const fetchMerchants = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    setLoading(true)
    try {
      const response = await fetch(`${apiBase}/api/user/merchants`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      if (response.ok) {
        setMerchants(data)
      } else {
        message.error(data.message || '获取商户列表失败')
      }
    } catch {
      message.error('获取商户列表失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchMerchantDetail = async (id) => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const response = await fetch(`${apiBase}/api/user/merchants/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      if (response.ok) {
        setDetailDrawer(data)
      } else {
        message.error(data.message || '获取商户详情失败')
      }
    } catch {
      message.error('获取商户详情失败')
    }
  }

  const handleResetPassword = async () => {
    try {
      const values = await form.validateFields()
      if (values.newPassword !== values.confirmPassword) {
        message.error('两次输入的密码不一致')
        return
      }

      setResetting(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${apiBase}/api/user/merchants/${resetModal.id}/reset-password`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newPassword: values.newPassword })
      })
      const data = await response.json()

      if (response.ok) {
        message.success('密码重置成功')
        setResetModal(null)
        form.resetFields()
      } else {
        message.error(data.message || '重置密码失败')
      }
    } catch (err) {
      if (err.errorFields) return
      message.error('重置密码失败')
    } finally {
      setResetting(false)
    }
  }

  useEffect(() => {
    fetchMerchants()
  }, [])

  const columns = [
    {
      title: '商户账号',
      dataIndex: 'username',
      render: (text) => (
        <Space>
          <UserOutlined />
          <span>{text}</span>
        </Space>
      )
    },
    {
      title: '酒店数量',
      dataIndex: 'hotelCount',
      render: (count, record) => (
        <Space>
          <ShopOutlined />
          <span>{count} 家</span>
          {record.approvedCount > 0 && (
            <Tag color="green">{record.approvedCount} 家上架</Tag>
          )}
        </Space>
      )
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      render: (v) => v ? new Date(v).toLocaleDateString('zh-CN') : '-'
    },
    {
      title: '操作',
      render: (_, record) => (
        <Space>
          <GlassButton
            type="link"
            icon={<EyeOutlined />}
            onClick={() => fetchMerchantDetail(record.id)}
          >
            查看
          </GlassButton>
          <GlassButton
            type="link"
            icon={<KeyOutlined />}
            onClick={() => {
              setResetModal(record)
              form.resetFields()
            }}
          >
            重置密码
          </GlassButton>
        </Space>
      )
    }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>商户管理</Typography.Title>
        <Typography.Text type="secondary">共 {merchants.length} 个商户</Typography.Text>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={merchants}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 商户详情抽屉 */}
      <Drawer
        title={detailDrawer?.username || '商户详情'}
        placement="right"
        size="large"
        onClose={() => setDetailDrawer(null)}
        open={!!detailDrawer}
      >
        {detailDrawer && (
          <Space style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 16 }}>
            <Card title="基本信息">
              <Descriptions column={1}>
                <Descriptions.Item label={<><UserOutlined /> 账号</>}>
                  {detailDrawer.username}
                </Descriptions.Item>
                <Descriptions.Item label={<><CalendarOutlined /> 注册时间</>}>
                  {detailDrawer.created_at ? new Date(detailDrawer.created_at).toLocaleDateString('zh-CN') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label={<><ShopOutlined /> 酒店数量</>}>
                  {detailDrawer.hotels?.length || 0} 家
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="酒店列表">
              {detailDrawer.hotels && detailDrawer.hotels.length > 0 ? (
                <List
                  size="small"
                  dataSource={detailDrawer.hotels}
                  renderItem={(hotel) => (
                    <List.Item>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <span>{hotel.name}</span>
                        <Space>
                          <Tag>{hotel.city}</Tag>
                          <Tag color={statusMap[hotel.status]?.color}>
                            {statusMap[hotel.status]?.label}
                          </Tag>
                        </Space>
                      </div>
                    </List.Item>
                  )}
                />
              ) : (
                <Typography.Text type="secondary">暂无酒店</Typography.Text>
              )}
            </Card>

            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <GlassButton
                icon={<KeyOutlined />}
                onClick={() => {
                  setResetModal(detailDrawer)
                  form.resetFields()
                }}
              >
                重置密码
              </GlassButton>
            </Space>
          </Space>
        )}
      </Drawer>

      {/* 重置密码弹窗 */}
      <Modal
        title={`重置密码 - ${resetModal?.username}`}
        open={!!resetModal}
        onCancel={() => {
          setResetModal(null)
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
                setResetModal(null)
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
