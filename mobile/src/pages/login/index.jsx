import React, { useState } from 'react'
import Taro from '@tarojs/taro'
import { View } from '@tarojs/components'
import { Form, Input, Button, Toast, Modal } from 'antd-mobile'
import { login, sendCode } from '../../services/auth'
import PageTopBar from '../../components/PageTopBar'
import './index.css'

const PHONE_REGEX = /^1\d{10}$/

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [form] = Form.useForm()

  React.useEffect(() => {
    if (countdown <= 0) return undefined
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  const onGetCode = async () => {
    const phone = form.getFieldValue('phone')
    if (!PHONE_REGEX.test(phone || '')) {
      Toast.show({
        icon: 'fail',
        content: '请输入正确的手机号'
      })
      return
    }
    try {
      const res = await sendCode(phone)
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
    } catch (error) {}
  }

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const res = await login(values)
      // request.js 会在错误时抛出异常，所以只要走到这里且 res 存在，就是成功
      if (res) {
        Toast.show({
          icon: 'success',
          content: '登录成功',
        })
        // 存储 Token
        Taro.setStorageSync('token', res.token)
        // 存储用户角色（可选）
        Taro.setStorageSync('userRole', res.userRole)
        
        // 跳转回个人中心或上一页
        Taro.navigateBack({ fail: () => Taro.reLaunch({ url: '/pages/account/index' }) })
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
      <PageTopBar title='手机号登录' onBack={handleBack} />
      <View className='title'>手机号登录</View>
      <Form
        form={form}
        layout='horizontal'
        onFinish={onFinish}
        footer={
          <Button block type='submit' color='primary' size='large' loading={loading}>
            登录
          </Button>
        }
      >
        <Form.Item
          name='phone'
          label='手机号'
          rules={[
            { required: true, message: '请输入手机号' },
            { pattern: PHONE_REGEX, message: '手机号格式不正确' }
          ]}
        >
          <Input placeholder='请输入手机号' maxLength={11} />
        </Form.Item>
        <Form.Item
          name='code'
          label='验证码'
          rules={[{ required: true, message: '请输入验证码' }]}
          extra={(
            <Button
              size='small'
              color='primary'
              fill='outline'
              disabled={countdown > 0}
              onClick={onGetCode}
            >
              {countdown > 0 ? `${countdown}s` : '获取验证码'}
            </Button>
          )}
        >
          <Input placeholder='请输入验证码' maxLength={6} />
        </Form.Item>
      </Form>
      <View className='footer-actions'>
        <Button fill='none' onClick={() => Taro.navigateTo({ url: '/pages/register/index' })}>
          没有账号？去注册
        </Button>
      </View>
    </View>
  )
}
