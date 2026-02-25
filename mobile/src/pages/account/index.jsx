import React from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { View } from '@tarojs/components'
import { List, Button, Avatar, Toast } from 'antd-mobile'
import { UserOutline } from 'antd-mobile-icons'
import { getCurrentUser } from '../../services/auth'
import { useUserContext } from '../../services/UserContext'
import PageTopBar from '../../components/PageTopBar'
import './index.css'

export default function Account() {
  // 从根组件 Context 读取，永远是当前最新状态，切换 tab 无需任何等待
  const { user, isLogin, setUser, setIsLogin, logout } = useUserContext()

  // useDidShow 在每次页面显示时后台静默校验 token，不影响初始渲染
  useDidShow(() => {
    const token = Taro.getStorageSync('token')
    if (!token) {
      logout()
      return
    }
    // 后台刷新，不影响 UI 初始显示
    getCurrentUser()
      .then((res) => {
        if (res && res.id) {
          setUser(res)
          setIsLogin(true)
        } else {
          logout()
        }
      })
      .catch(() => {
        // 401 等：保留 UI 当前状态，不主动下线（避免网络抖动误退登）
      })
  })

  const handleLogout = () => {
    logout()
    Toast.show({ content: '已退出登录', icon: 'success' })
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
      <PageTopBar title='我的' />
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
          <Button block color='danger' fill='outline' size='large' onClick={handleLogout}>
            退出登录
          </Button>
        </View>
      )}
    </View>
  )
}
