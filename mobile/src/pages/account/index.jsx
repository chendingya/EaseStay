import React, { useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { View } from '@tarojs/components'
import { List, Button, Avatar, Toast } from 'antd-mobile'
import { UserOutline } from 'antd-mobile-icons'
import { getCurrentUser } from '../../services/auth'
import './index.css'

export default function Account() {
  const [user, setUser] = useState(null)
  const [isLogin, setIsLogin] = useState(false)

  const fetchUserInfo = async () => {
    const token = Taro.getStorageSync('token')
    if (!token) {
      setIsLogin(false)
      setUser(null)
      return
    }

    try {
      const res = await getCurrentUser()
      if (res && res.id) {
        setUser(res)
        setIsLogin(true)
      } else {
        // Token 失效
        handleLogout()
      }
    } catch (error) {
      console.error(error)
      // 如果获取失败（如401），也视为未登录
      setIsLogin(false)
    }
  }

  useDidShow(() => {
    fetchUserInfo()
  })

  const handleLogout = () => {
    Taro.removeStorageSync('token')
    Taro.removeStorageSync('userRole')
    setIsLogin(false)
    setUser(null)
    Toast.show({
      content: '已退出登录',
      icon: 'success'
    })
  }

  const handleLogin = () => {
    Taro.navigateTo({ url: '/pages/login/index' })
  }

  const handleOpenOrders = () => {
    if (!isLogin) {
      handleLogin()
      return
    }
    Taro.navigateTo({ url: '/pages/orders/index' })
  }

  const handleOpenFavorites = () => {
    Taro.navigateTo({ url: '/pages/favorites/index' })
  }

  return (
    <View className='account-page'>
      <View className='header'>
        <View className='avatar-container'>
          <Avatar src='' style={{ '--size': '64px', '--border-radius': '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} fallback={<UserOutline fontSize={40} />} />
        </View>
        <View className='user-info'>
          {isLogin ? (
            <View className='username'>{user?.username || '用户'}</View>
          ) : (
            <Button color='primary' fill='outline' size='small' onClick={handleLogin}>
              点击登录/注册
            </Button>
          )}
        </View>
      </View>

      <List header='我的服务'>
        <List.Item onClick={handleOpenOrders} description={isLogin ? '' : '登录后可查看'}>
          我的订单
        </List.Item>
        <List.Item onClick={handleOpenFavorites}>
          我的收藏
        </List.Item>
      </List>

      {isLogin && (
        <View className='logout-container'>
          <Button block color='danger' onClick={handleLogout}>
            退出登录
          </Button>
        </View>
      )}
    </View>
  )
}
