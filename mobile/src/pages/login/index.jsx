import React, { useState } from 'react'
import Taro from '@tarojs/taro'
import { View } from '@tarojs/components'
import { Form, Input, Button, Toast, Modal } from 'antd-mobile'
import { loginByCode, loginByPassword, sendCode } from '../../services/auth'
import { useUserContext } from '../../services/UserContext'
import { getCurrentUser } from '../../services/auth'
import PageTopBar from '../../components/PageTopBar'
import './index.css'

const LOGIN_MODE = {
  CODE: 'code',
  PASSWORD: 'password'
}

export default function Login() {
  const { setUser, setIsLogin } = useUserContext()
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [sendingCode, setSendingCode] = useState(false)
  const [mode, setMode] = useState(LOGIN_MODE.CODE)
  const [form] = Form.useForm()
  const sendingCodeRef = React.useRef(false)

  const navigateAfterLogin = () => {
    const pages = Taro.getCurrentPages ? Taro.getCurrentPages() : []
    const prevPage = pages.length > 1 ? pages[pages.length - 2] : null
    const prevRoute = String(
      prevPage?.route
      || prevPage?.$component?.$router?.path
      || prevPage?.$taroPath
      || ''
    )

    // If previous page is another auth page (or missing), force a clean jump.
    if (!prevRoute || prevRoute.includes('/pages/login/index') || prevRoute.includes('/pages/register/index')) {
      Taro.reLaunch({ url: '/pages/account/index' })
      return
    }

    Taro.navigateBack({ fail: () => Taro.reLaunch({ url: '/pages/account/index' }) })
  }

  React.useEffect(() => {
    if (countdown <= 0) return undefined
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  const onGetCode = async () => {
    if (sendingCodeRef.current || countdown > 0) return
    const username = String(form.getFieldValue('username') || '').trim()
    if (!username) {
      Toast.show({
        icon: 'fail',
        content: '请先输入用户名'
      })
      return
    }
    try {
      sendingCodeRef.current = true
      setSendingCode(true)
      const res = await sendCode(username)
      setCountdown(60)
      Toast.show({
        icon: 'success',
        content: '验证码已发送',
      })
      if (res?.code) {
        Modal.alert({
          content: `模拟验证码：${res.code}`,
        })
        form.setFieldsValue({ code: res.code })
      }
    } catch (error) {
    } finally {
      sendingCodeRef.current = false
      setSendingCode(false)
    }
  }

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const payload = { username: values.username }
      const res = mode === LOGIN_MODE.CODE
        ? await loginByCode({ ...payload, code: values.code })
        : await loginByPassword({ ...payload, password: values.password })
      // request.js 会在错误时抛出异常，所以只要走到这里且 res 存在，就是成功
      if (res) {
        Toast.show({
          icon: 'success',
          content: '登录成功',
        })
        // 存储 Token
        Taro.setStorageSync('token', res.token)
        Taro.setStorageSync('userRole', res.userRole)
        // 获取并写入全局 Context， account 页面返回后直接显示登录状态
        try {
          const userRes = await getCurrentUser()
          if (userRes && userRes.id) {
            setUser(userRes)
            setIsLogin(true)
          }
        } catch (e) {}

        // Prefer back-navigation, but avoid returning to stacked auth pages.
        navigateAfterLogin()
      }
    } catch (error) {
      Toast.show({
        icon: 'fail',
        content: error.message || '登录失败',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    const pages = Taro.getCurrentPages ? Taro.getCurrentPages() : []
    if (pages.length > 1) {
      Taro.navigateBack()
      return
    }
    Taro.reLaunch({ url: '/pages/account/index' })
  }

  return (
    <View className='login-page'>
      <PageTopBar title='账号登录' onBack={handleBack} />
      <View className='auth-main'>
        <View className='auth-hero'>
          <View className='auth-title'>账号登录</View>
          <View className='auth-subtitle'>支持密码或验证码登录</View>
        </View>

        <View className='auth-card'>
          <View className='auth-mode-switch' role='tablist'>
            <Button
              className={`auth-mode-btn ${mode === LOGIN_MODE.CODE ? 'is-active' : ''}`}
              fill='none'
              onClick={() => setMode(LOGIN_MODE.CODE)}
            >
              验证码登录
            </Button>
            <Button
              className={`auth-mode-btn ${mode === LOGIN_MODE.PASSWORD ? 'is-active' : ''}`}
              fill='none'
              onClick={() => setMode(LOGIN_MODE.PASSWORD)}
            >
              密码登录
            </Button>
          </View>

          <Form
            form={form}
            className='auth-form'
            layout='vertical'
            onFinish={onFinish}
            footer={
              <Button
                className='auth-submit-btn'
                block
                type='submit'
                color='primary'
                size='large'
                loading={loading}
              >
                {mode === LOGIN_MODE.CODE ? '验证码登录' : '密码登录'}
              </Button>
            }
          >
            <Form.Item
              name='username'
              label='用户名'
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input className='auth-input' placeholder='请输入用户名' />
            </Form.Item>

            {mode === LOGIN_MODE.CODE ? (
              <Form.Item
                className='auth-code-form-item'
                label='验证码'
                required
              >
                <View className='auth-code-row'>
                  <Form.Item
                    name='code'
                    noStyle
                    rules={[{ required: true, message: '请输入验证码' }]}
                  >
                    <Input className='auth-input auth-code-input' placeholder='请输入验证码' maxLength={6} />
                  </Form.Item>
                  <Button
                    className='auth-code-btn'
                    size='middle'
                    color='primary'
                    fill='outline'
                    disabled={countdown > 0 || sendingCode}
                    onClick={onGetCode}
                  >
                    {countdown > 0 ? `${countdown}s` : (sendingCode ? '发送中...' : '获取验证码')}
                  </Button>
                </View>
              </Form.Item>
            ) : (
              <Form.Item
                name='password'
                label='密码'
                rules={[{ required: true, message: '请输入密码' }]}
              >
                <Input className='auth-input' placeholder='请输入密码' clearable type='password' />
              </Form.Item>
            )}
          </Form>

          <View className='auth-footer-actions'>
            <Button className='auth-link-btn' fill='none' onClick={() => Taro.navigateTo({ url: '/pages/register/index' })}>
              没有账号？去注册
            </Button>
          </View>
        </View>
      </View>
    </View>
  )
}
