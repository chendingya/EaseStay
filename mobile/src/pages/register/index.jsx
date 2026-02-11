import React, { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { View } from '@tarojs/components'
import { Form, Input, Button, Toast, Modal } from 'antd-mobile'
import { register, sendCode } from '../../services/auth'
import './index.css'

export default function Register() {
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    let timer
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [countdown])

  const onGetCode = async () => {
    const username = form.getFieldValue('username')
    if (!username) {
      Toast.show('请先输入用户名')
      return
    }

    try {
      const res = await sendCode(username)
      // request.js 会在错误时抛出异常，所以只要走到这里且 res 存在，就是成功
      // 后端返回的数据不一定包含 ok 字段，所以直接判断 res 即可
      if (res) {
        Toast.show({
          icon: 'success',
          content: '验证码已发送',
        })
        setCountdown(60)
        // 方便测试，直接弹窗显示验证码
        if (res.code) {
          Modal.alert({
            content: `测试环境验证码：${res.code}`,
          })
          // 自动填充
          form.setFieldsValue({ code: res.code })
        }
      }
    } catch (error) {
      Toast.show({
        icon: 'fail',
        content: error.message || '发送失败',
      })
    }
  }

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const res = await register(values)
      // request.js 会在错误时抛出异常，所以只要走到这里且 res 存在，就是成功
      if (res) {
        Toast.show({
          icon: 'success',
          content: '注册成功，请登录',
        })
        setTimeout(() => {
          Taro.navigateBack()
        }, 1500)
      }
    } catch (error) {
      Toast.show({
        icon: 'fail',
        content: error.message || '注册失败',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='register-page'>
      <View className='title'>新用户注册</View>
      <Form
        form={form}
        layout='horizontal'
        onFinish={onFinish}
        footer={
          <Button block type='submit' color='primary' size='large' loading={loading}>
            注册
          </Button>
        }
      >
        <Form.Item
          name='username'
          label='用户名'
          rules={[{ required: true, message: '请输入用户名' }]}
        >
          <Input placeholder='请输入用户名' />
        </Form.Item>
        <Form.Item
          name='password'
          label='密码'
          rules={[{ required: true, message: '请输入密码' }]}
        >
          <Input placeholder='请输入密码' type='password' />
        </Form.Item>
        <Form.Item
          name='code'
          label='验证码'
          rules={[{ required: true, message: '请输入验证码' }]}
          extra={
            <Button 
              size='small' 
              color='primary' 
              fill='outline' 
              disabled={countdown > 0}
              onClick={onGetCode}
            >
              {countdown > 0 ? `${countdown}s` : '获取验证码'}
            </Button>
          }
        >
          <Input placeholder='请输入验证码' />
        </Form.Item>
      </Form>
      <View className='footer-actions'>
        <Button fill='none' onClick={() => Taro.navigateBack()}>
          已有账号？去登录
        </Button>
      </View>
    </View>
  )
}
