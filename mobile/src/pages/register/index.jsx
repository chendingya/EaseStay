import React, { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View } from '@tarojs/components'
import { Form, Input, Button, Toast, Modal } from 'antd-mobile'
import { loginByPassword, registerByPassword, sendCode } from '../../services/auth'
import { useUserContext } from '../../services/UserContext'
import { getCurrentUser } from '../../services/auth'
import PageTopBar from '../../components/PageTopBar'
import './index.css'

export default function Register() {
  const { setUser, setIsLogin } = useUserContext()
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [sendingCode, setSendingCode] = useState(false)
  const [form] = Form.useForm()
  const sendingCodeRef = React.useRef(false)

  useEffect(() => {
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
      await registerByPassword({
        username: values.username,
        password: values.password,
        code: values.code,
        role: 'user'
      })

      const loginRes = await loginByPassword({
        username: values.username,
        password: values.password
      })

      if (loginRes?.token) {
        Taro.setStorageSync('token', loginRes.token)
        Taro.setStorageSync('userRole', loginRes.userRole || 'user')
        // 获取并写入全局 Context
        try {
          const userRes = await getCurrentUser()
          if (userRes && userRes.id) {
            setUser(userRes)
            setIsLogin(true)
          }
        } catch (e) {}
      }
      Toast.show({ icon: 'success', content: '注册成功' })
      Taro.reLaunch({ url: '/pages/account/index' })
    } catch (error) {
      Toast.show({
        icon: 'fail',
        content: error.message || '注册失败',
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
    <View className='register-page'>
      <PageTopBar title='账号注册' onBack={handleBack} />
      <View className='auth-main'>
        <View className='auth-hero'>
          <View className='auth-title'>创建账号</View>
          <View className='auth-subtitle'>完成注册后即可快捷下单并同步收藏</View>
        </View>

        <View className='auth-card'>
          <Form
            form={form}
            className='auth-form'
            layout='vertical'
            onFinish={onFinish}
            footer={(
              <Button
                className='auth-submit-btn'
                block
                type='submit'
                color='primary'
                size='large'
                loading={loading}
              >
                注册并登录
              </Button>
            )}
          >
            <Form.Item
              name='username'
              label='用户名'
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input className='auth-input' placeholder='请输入用户名' />
            </Form.Item>
            <Form.Item
              name='password'
              label='密码'
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少 6 位' }
              ]}
            >
              <Input className='auth-input' placeholder='请输入密码' clearable type='password' />
            </Form.Item>
            <Form.Item
              name='confirmPassword'
              label='确认密码'
              dependencies={['password']}
              validateTrigger={['onChange', 'onBlur']}
              rules={[
                { required: true, message: '请再次输入密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve()
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'))
                  }
                })
              ]}
            >
              <Input className='auth-input' placeholder='请再次输入密码' clearable type='password' />
            </Form.Item>
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
          </Form>

          <View className='auth-footer-actions'>
            <Button className='auth-link-btn' fill='none' onClick={() => Taro.navigateBack()}>
              已有账号？去登录
            </Button>
          </View>
        </View>
      </View>
    </View>
  )
}
