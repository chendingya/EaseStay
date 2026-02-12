import { ConfigProvider, Form, Input, Select, Tabs, Typography, theme } from 'antd'
import { LockOutlined, MobileOutlined, UserOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { GlassButton, glassMessage as message } from '../components'
import { api } from '../services'
import './Login.css'

export default function Login({ onLoggedIn }) {
  const { token } = theme.useToken()
  const [activeTab, setActiveTab] = useState('login')
  const [sending, setSending] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [form] = Form.useForm()

  const handleLogin = async (values) => {
    try {
      const data = await api.post('/api/auth/login', { username: values.username, password: values.password })
      onLoggedIn({ token: data.token, role: data.userRole, username: values.username })
      message.success('登录成功')
      return true
    } catch (error) {
      console.error('登录失败:', error)
      return false
    }
  }

  const handleRegister = async (values) => {
    try {
      await api.post('/api/auth/register', {
        username: values.username,
        password: values.password,
        role: values.role,
        code: values.code
      })
      const loginOk = await handleLogin({ username: values.username, password: values.password })
      if (loginOk) message.success('注册成功')
      return loginOk
    } catch (error) {
      console.error('注册失败:', error)
      return false
    }
  }

  const handleSendCode = async () => {
    const username = form.getFieldValue('username')
    if (!username) {
      message.warning('请先填写账号')
      return
    }
    setSending(true)
    try {
      const data = await api.post('/api/auth/sms/send', { username })
      form.setFieldsValue({ code: data.code })
      message.success(`验证码已发送：${data.code}`)
      setSeconds(60)
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    if (!seconds) return
    const timer = setInterval(() => {
      setSeconds((prev) => (prev > 1 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [seconds])

  return (
    <ConfigProvider>
      <div className="pro-login-page">
        <video
          className="pro-login-video"
          autoPlay
          muted
          loop
          playsInline
          poster="https://mdn.alipayobjects.com/huamei_gcee1x/afts/img/A*y0ZTS6WLwvgAAAAAAAAAAAAADml6AQ/fmt.webp"
        >
          <source src="https://gw.alipayobjects.com/v/huamei_gcee1x/afts/video/jXRBRK_VAwoAAAAAAAAAAAAAK4eUAQBr" type="video/mp4" />
        </video>
        <div className="pro-login-bg" />
        <div className="pro-login-shell">
          <div className="pro-login-card" style={{ borderColor: token.colorBorderSecondary }}>
          <div className="pro-login-title">
            <div className="pro-login-logo">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="48" height="48" rx="12" fill="#1677ff"/>
                <path d="M24 8L8 18v20l16 10 16-10V18L24 8z" fill="#fff" fillOpacity="0.9"/>
                <path d="M24 14l-10 6v12l10 6 10-6V20l-10-6z" fill="#1677ff"/>
                <circle cx="24" cy="26" r="4" fill="#fff"/>
              </svg>
            </div>
            <div>
              <Typography.Title level={4} style={{ marginBottom: 0, color: '#0f172a' }}>易宿酒店平台</Typography.Title>
              <Typography.Text style={{ color: '#475569' }}>一站式酒店管理与预订协同平台</Typography.Text>
            </div>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={async (values) => {
              if (submitting) return false
              setSubmitting(true)
              try {
                if (activeTab === 'register') return await handleRegister(values)
                return await handleLogin(values)
              } finally {
                setSubmitting(false)
              }
            }}
          >
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                { key: 'login', label: '登录' },
                { key: 'register', label: '注册' }
              ]}
            />

            {activeTab === 'login' && (
              <>
                <Form.Item name="username" rules={[{ required: true, message: '请输入账号!' }]}>
                  <Input
                    size="large"
                    prefix={<UserOutlined style={{ color: token.colorText }} />}
                    placeholder="请输入账号"
                  />
                </Form.Item>

                <Form.Item name="password" rules={[{ required: true, message: '请输入密码！' }]}>
                  <Input.Password
                    size="large"
                    prefix={<LockOutlined style={{ color: token.colorText }} />}
                    placeholder="请输入密码"
                  />
                </Form.Item>
              </>
            )}

            {activeTab === 'register' && (
              <>
                <Form.Item
                  name="username"
                  rules={[{ required: true, message: '请输入账号!' }]}
                >
                  <Input
                    size="large"
                    prefix={<UserOutlined style={{ color: token.colorText }} />}
                    placeholder="请输入账号"
                  />
                </Form.Item>
                <Form.Item
                  name="password"
                  rules={[{ required: true, message: '请输入密码！' }]}
                >
                  <Input.Password
                    size="large"
                    prefix={<LockOutlined style={{ color: token.colorText }} />}
                    placeholder="请输入密码"
                  />
                </Form.Item>
                <Form.Item
                  name="code"
                  rules={[
                    { required: true, message: '请输入验证码！' },
                    { pattern: /^\d{6}$/, message: '验证码为 6 位数字' }
                  ]}
                >
                  <Input
                    size="large"
                    prefix={<MobileOutlined style={{ color: token.colorText }} />}
                    placeholder="请输入验证码"
                    addonAfter={(
                      <GlassButton
                        type="link"
                        onClick={handleSendCode}
                        disabled={seconds > 0}
                        loading={sending}
                      >
                        {seconds > 0 ? `${seconds}s` : '获取验证码'}
                      </GlassButton>
                    )}
                  />
                </Form.Item>
                <Form.Item name="role" rules={[{ required: true, message: '请选择角色' }]} initialValue="merchant">
                  <Select
                    size="large"
                    options={[
                      { value: 'merchant', label: '商户' },
                      { value: 'admin', label: '管理员' }
                    ]}
                    placeholder="选择角色"
                  />
                </Form.Item>
                <div className="pro-login-hint">验证码由后端模拟短信生成并返回前端。</div>
              </>
            )}

            <GlassButton type="primary" htmlType="submit" size="large" block loading={submitting} disabled={submitting}>
              {activeTab === 'register' ? '注册并登录' : '登录'}
            </GlassButton>
            </Form>

          <div style={{ height: 4 }} />
          </div>

          {/* 活动提示条 - 位于登录卡片底部 */}
          <div className="pro-login-activity-bar">
            <span className="pro-login-activity-icon">🎉</span>
            <span className="pro-login-activity-text">易宿 · 经营增长季：专属补贴 + 智能推荐，提升转化与入住率</span>
            <GlassButton type="link" size="small" className="pro-login-activity-link">了解详情 →</GlassButton>
          </div>
        </div>
      </div>
    </ConfigProvider>
  )
}
