import { Card, Form, Input, Space, Typography, Descriptions, Divider, Modal } from 'antd'
import { useEffect, useState } from 'react'
import { UserOutlined, LockOutlined, CalendarOutlined } from '@ant-design/icons'
import { GlassButton, glassMessage as message } from '../components'
import { api } from '../services/request'

export default function Account() {
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [passwordModal, setPasswordModal] = useState(false)
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const fetchUser = async () => {
    setLoading(true)
    try {
      const data = await api.get('/api/user/me')
      setUser(data)
    } catch (error) {
      console.error('获取用户信息失败:', error)
      message.error('获取用户信息失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])

  const handleChangePassword = async () => {
    try {
      const values = await form.validateFields()
      if (values.newPassword !== values.confirmPassword) {
        message.error('两次输入的新密码不一致')
        return
      }

      setSaving(true)
      await api.post('/api/user/change-password', {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword
      })
      message.success('密码修改成功')
      setPasswordModal(false)
      form.resetFields()
    } catch (err) {
      if (err.errorFields) return
      console.error('修改密码失败:', err)
      message.error('修改密码失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 24 }}>
      <Typography.Title level={4} style={{ margin: 0 }}>账户管理</Typography.Title>

      <Card title="基本信息" loading={loading}>
        {user && (
          <Descriptions column={1} styles={{ label: { width: 120 } }}>
            <Descriptions.Item label={<><UserOutlined /> 用户名</>}>
              {user.username}
            </Descriptions.Item>
            <Descriptions.Item label="账户角色">
              {user.role === 'admin' ? '管理员' : '商户'}
            </Descriptions.Item>
            <Descriptions.Item label={<><CalendarOutlined /> 注册时间</>}>
              {user.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      <Card title="安全设置">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Typography.Text strong><LockOutlined /> 登录密码</Typography.Text>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 4 }}>
              定期更换密码可以提高账户安全性
            </Typography.Paragraph>
          </div>
          <GlassButton onClick={() => setPasswordModal(true)}>修改密码</GlassButton>
        </div>
      </Card>

      <Modal
        title="修改密码"
        open={passwordModal}
        onCancel={() => {
          setPasswordModal(false)
          form.resetFields()
        }}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="oldPassword"
            label="原密码"
            rules={[{ required: true, message: '请输入原密码' }]}
          >
            <Input.Password placeholder="请输入原密码" />
          </Form.Item>

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
            label="确认新密码"
            rules={[
              { required: true, message: '请再次输入新密码' },
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
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <GlassButton onClick={() => {
                setPasswordModal(false)
                form.resetFields()
              }}>取消</GlassButton>
              <GlassButton type="primary" loading={saving} onClick={handleChangePassword}>
                确认修改
              </GlassButton>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
