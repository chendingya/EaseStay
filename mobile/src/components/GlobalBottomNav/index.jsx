import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import {
  AppOutline,
  UnorderedListOutline,
  HeartOutline,
  UserOutline
} from 'antd-mobile-icons'
import './index.css'

const navItems = [
  { key: '/pages/index/index', label: '首页', icon: AppOutline },
  { key: '/pages/orders/index', label: '订单', icon: UnorderedListOutline },
  { key: '/pages/favorites/index', label: '收藏', icon: HeartOutline },
  { key: '/pages/account/index', label: '我的', icon: UserOutline }
]

const getCurrentPath = () => {
  const pages = Taro.getCurrentPages ? Taro.getCurrentPages() : []
  if (pages && pages.length > 0) {
    return `/${pages[pages.length - 1].route}`
  }
  if (typeof window !== 'undefined') {
    const path = window.location.pathname || ''
    return path.replace(/\/+$/, '') || '/pages/index/index'
  }
  return '/pages/index/index'
}

export default function GlobalBottomNav() {
  const currentPath = getCurrentPath()

  const handleNav = (target) => {
    if (target === currentPath) return
    Taro.reLaunch({ url: target })
  }

  return (
    <View className='global-bottom-nav'>
      {navItems.map((item) => {
        const Icon = item.icon
        const active = currentPath === item.key
        return (
          <View
            key={item.key}
            className={`global-bottom-nav-item ${active ? 'active' : ''}`}
            onClick={() => handleNav(item.key)}
          >
            <View className='global-bottom-nav-pill'>
              <Icon className='global-bottom-nav-icon' />
              <Text className='global-bottom-nav-label'>{item.label}</Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}
