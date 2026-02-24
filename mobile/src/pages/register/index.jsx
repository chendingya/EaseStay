import React, { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View } from '@tarojs/components'
import { Form, Input, Button, Toast, Modal } from 'antd-mobile'
import { register, sendCode } from '../../services/auth'
import PageTopBar from '../../components/PageTopBar'
import './index.css'

const PHONE_REGEX = /^1\d{10}$/

export default function Register() {
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [form] = Form.useForm()

  useEffect(() => {
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
      const res = await register(values)
      if (res?.token) {
        Taro.setStorageSync('token', res.token)
        Taro.setStorageSync('userRole', res.userRole || 'user')
      }
      Toast.show({
        icon: 'success',
        content: '注册成功',
      })
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
      <PageTopBar title='手机号注册' onBack={handleBack} />
      <View className='auth-hero'>
        <View className='auth-title'>手机号注册</View>
        <View className='auth-subtitle'>注册后即可快捷下单并同步收藏</View>
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
            name='phone'
            label='手机号'
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: PHONE_REGEX, message: '手机号格式不正确' }
            ]}
          >
            <Input className='auth-input' placeholder='请输入手机号' maxLength={11} />
          </Form.Item>
          <Form.Item
            name='code'
            label='验证码'
            rules={[{ required: true, message: '请输入验证码' }]}
            extra={(
              <Button
                className='auth-code-btn'
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
            <Input className='auth-input' placeholder='请输入验证码' maxLength={6} />
          </Form.Item>
        </Form>

        <View className='auth-footer-actions'>
          <Button className='auth-link-btn' fill='none' onClick={() => Taro.navigateBack()}>
            已有账号？去登录
          </Button>
        </View>
      </View>
    </View>
  )
}
