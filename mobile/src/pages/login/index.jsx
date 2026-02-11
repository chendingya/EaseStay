import React, { useState } from 'react'
import Taro from '@tarojs/taro'
import { View } from '@tarojs/components'
import { Form, Input, Button, Toast } from 'antd-mobile'
import { login } from '../../services/auth'
import './index.css'

export default function Login() {
  const [loading, setLoading] = useState(false)

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
        Taro.navigateBack({ fail: () => Taro.switchTab({ url: '/pages/account/index' }) })
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

  return (
    <View className='login-page'>
      <View className='title'>账号登录</View>
      <Form
        layout='horizontal'
        onFinish={onFinish}
        footer={
          <Button block type='submit' color='primary' size='large' loading={loading}>
            登录
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
      </Form>
      <View className='footer-actions'>
        <Button fill='none' onClick={() => Taro.navigateTo({ url: '/pages/register/index' })}>
          没有账号？去注册
        </Button>
      </View>
    </View>
  )
}
