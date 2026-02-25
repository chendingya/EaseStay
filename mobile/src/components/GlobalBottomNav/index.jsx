import { useEffect, useState } from 'react'
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

const INVALID_ROUTES = new Set(['/undefined', '/null', '/nan'])

// 这些页面不显示底部导航栏
const HIDDEN_ROUTES = new Set(['/pages/map/index'])

const normalizePath = (rawPath) => {
  let path = String(rawPath || '')
  if (!path) return '/pages/index/index'

  if (path.startsWith('#/')) {
    path = path.slice(1)
  } else if (path.startsWith('/#/')) {
    path = path.slice(2)
  }

  path = path.split('?')[0].split('#')[0].replace(/\.html$/i, '')
  if (!path.startsWith('/')) {
    path = `/${path}`
  }
  path = path.replace(/\/+$/, '')

  // H5 常见别名路径兼容，统一映射到页面路由
  if (!path || path === '/' || path === '/index' || path === '/home') {
    return '/pages/index/index'
  }
  if (path.includes('/orders')) {
    return '/pages/orders/index'
  }
  if (path.includes('/favorites') || path.includes('/favorite')) {
    return '/pages/favorites/index'
  }
  if (path.includes('/account') || path.includes('/my') || path.includes('/mine')) {
    return '/pages/account/index'
  }
  if (path.includes('/list')) {
    return '/pages/list/index'
  }
  if (path.includes('/detail')) {
    return '/pages/detail/index'
  }

  if (INVALID_ROUTES.has(path.toLowerCase())) {
    return '/pages/index/index'
  }

  return path || '/pages/index/index'
}

const getRouteFromCurrentPages = () => {
  if (!Taro.getCurrentPages) return ''
  const pages = Taro.getCurrentPages() || []
  if (!pages.length) return ''

  const current = pages[pages.length - 1] || {}
  const candidates = [
    current.route,
    current.path,
    current.$taroPath,
    current?.$component?.$router?.path
  ]

  const route = candidates.find((item) => typeof item === 'string' && item.trim())
  if (!route) return ''
  return route.startsWith('/') ? route : `/${route}`
}

const readCurrentPath = () => {
  if (typeof window !== 'undefined') {
    if (window.location.hash && window.location.hash.startsWith('#/')) {
      return normalizePath(window.location.hash)
    }

    const fromPathname = normalizePath(window.location.pathname)
    if (fromPathname) return fromPathname
  }

  const routeFromPages = getRouteFromCurrentPages()
  if (routeFromPages) {
    return normalizePath(routeFromPages)
  }

  return '/pages/index/index'
}

const isNavActive = (currentPath, key) => {
  const normalizedCurrent = normalizePath(currentPath)
  const normalizedKey = normalizePath(key)
  const isHomeKey = normalizedKey === '/pages/index/index'

  if (isHomeKey) {
    // 首页只在首页/搜索列表场景高亮
    return normalizedCurrent === '/pages/index/index' || normalizedCurrent === '/pages/list/index'
  }

  // 其余导航仅匹配自身，避免多项同时高亮
  return normalizedCurrent === normalizedKey
}

export default function GlobalBottomNav() {
  const [currentPath, setCurrentPath] = useState(() => readCurrentPath())

  useEffect(() => {
    const syncPath = () => {
      const next = readCurrentPath()
      setCurrentPath((prev) => (prev === next ? prev : next))
    }

    syncPath()
    let timer = null
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', syncPath)
      window.addEventListener('hashchange', syncPath)
      timer = window.setInterval(syncPath, 300)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('popstate', syncPath)
        window.removeEventListener('hashchange', syncPath)
        if (timer) {
          window.clearInterval(timer)
        }
      }
    }
  }, [])

  const handleNav = (target) => {
    if (isNavActive(currentPath, target)) return
    Taro.reLaunch({ url: target })
  }

  // 地图页等特殊页面不显示底部导航
  if (HIDDEN_ROUTES.has(normalizePath(currentPath))) return null

  return (
    <View className='global-bottom-nav' role='navigation' aria-label='主导航'>
      {navItems.map((item) => {
        const Icon = item.icon
        const active = isNavActive(currentPath, item.key)
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
