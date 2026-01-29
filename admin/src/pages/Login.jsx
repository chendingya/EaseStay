import { Button, ConfigProvider, Form, Input, Select, Tabs, Typography, theme } from 'antd'
import { LockOutlined, MobileOutlined, UserOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { glassMessage as message } from '../components/GlassUI'
import './Login.css'

const apiBase = 'http://127.0.0.1:4100'

const iconStyles = {
  color: 'rgba(0, 0, 0, 0.25)',
  fontSize: '18px',
  verticalAlign: 'middle',
  cursor: 'pointer'
}

export default function Login({ onLoggedIn }) {
  const { token } = theme.useToken()
  const [activeTab, setActiveTab] = useState('login')
  const [sending, setSending] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [form] = Form.useForm()

  const handleLogin = async (values) => {
    const response = await fetch(`${apiBase}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: values.username, password: values.password })
    })
    const data = await response.json()
    if (!response.ok) {
      message.error(data.message || '登录失败')
      return false
    }
    onLoggedIn({ token: data.token, role: data.userRole, username: values.username })
    message.success('登录成功')
    return true
  }

  const handleRegister = async (values) => {
    const response = await fetch(`${apiBase}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: values.username,
        password: values.password,
        role: values.role,
        code: values.code
      })
    })
    const data = await response.json()
    if (!response.ok) {
      message.error(data.message || '注册失败')
      return false
    }
    const loginOk = await handleLogin({ username: values.username, password: values.password })
    if (loginOk) message.success('注册成功')
    return loginOk
  }

  const handleSendCode = async () => {
    const username = form.getFieldValue('username')
    if (!username) {
      message.warning('请先填写账号')
      return
    }
    setSending(true)
    const response = await fetch(`${apiBase}/api/auth/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    })
    const data = await response.json()
    if (!response.ok) {
      message.error(data.message || '验证码发送失败')
      setSending(false)
      return
    }
    form.setFieldsValue({ code: data.code })
    message.success(`验证码已发送：${data.code}`)
    setSeconds(60)
    setSending(false)
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
            <img
              alt="logo"
              src="https://gw.alipayobjects.com/zos/bmw-prod/3f9b6d2b-1b1c-4c45-9f06-1b7c98e65a0f.svg"
              className="pro-login-logo"
            />
            <div>
              <Typography.Title level={4} style={{ marginBottom: 0, color: '#0f172a' }}>易宿酒店平台</Typography.Title>
              <Typography.Text style={{ color: '#475569' }}>一站式酒店管理与预订协同平台</Typography.Text>
            </div>
          </div>

          <div className="pro-login-activity">
            <div className="pro-login-activity-title">易宿 · 经营增长季</div>
            <div className="pro-login-activity-subtitle">专属补贴 + 智能推荐，提升转化与入住率</div>
            <Button size="large" className="pro-login-activity-btn">去看看</Button>
          </div>

          <Form
              form={form}
              layout="vertical"
              onFinish={async (values) => {
                if (activeTab === 'register') return handleRegister(values)
                return handleLogin(values)
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
                      <Button
                        type="link"
                        onClick={handleSendCode}
                        disabled={seconds > 0}
                        loading={sending}
                      >
                        {seconds > 0 ? `${seconds}s` : '获取验证码'}
                      </Button>
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

            <Button type="primary" htmlType="submit" size="large" block>
              {activeTab === 'register' ? '注册并登录' : '登录'}
            </Button>
            </Form>

          <div style={{ height: 4 }} />
          </div>
        </div>
      </div>
    </ConfigProvider>
  )
}
