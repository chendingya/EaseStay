import './App.css'
import { Layout, Menu, Space, Typography, Tag, Button, Breadcrumb, Badge, Tooltip, Result, Select, ConfigProvider } from 'antd'
import { HomeOutlined, SettingOutlined, UserOutlined, TeamOutlined, BellOutlined, FileSearchOutlined, ShopOutlined, MenuFoldOutlined, MenuUnfoldOutlined, GlobalOutlined } from '@ant-design/icons'
import { Routes, Route, useLocation, useNavigate, Navigate, Outlet } from 'react-router-dom'
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import { loadNamespaces } from './locales'
import { getUnreadCount, onUnreadCountChange, api } from './services'
import { routeConfig, getRouteNamespaces } from './routes/routeConfig'

const appPerfStart = import.meta.env.DEV ? performance.now() : 0
const Login = lazy(() => import('./pages/Login.jsx'))
const Hotels = lazy(() => import('./pages/Hotels.jsx'))
const HotelDetail = lazy(() => import('./pages/HotelDetail.jsx'))
const HotelEdit = lazy(() => import('./pages/HotelEdit.jsx'))
const Audit = lazy(() => import('./pages/Audit.jsx'))
const AuditDetail = lazy(() => import('./pages/AuditDetail.jsx'))
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Account = lazy(() => import('./pages/Account.jsx'))
const Merchants = lazy(() => import('./pages/Merchants.jsx'))
const RequestAudit = lazy(() => import('./pages/RequestAudit.jsx'))
const Messages = lazy(() => import('./pages/Messages.jsx'))
const AdminHotels = lazy(() => import('./pages/AdminHotels.jsx'))
const AdminHotelDetail = lazy(() => import('./pages/AdminHotelDetail.jsx'))
const MerchantDetail = lazy(() => import('./pages/MerchantDetail.jsx'))
const OrderStats = lazy(() => import('./pages/OrderStats.jsx'))

function LazyRoute({ children }) {
  return <Suspense fallback={null}>{children}</Suspense>
}

// 面包屑组件
function AppBreadcrumb() {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  
  const breadcrumbItems = useMemo(() => {
    const path = location.pathname
    const idMatch = path.match(/\/(hotels|admin-hotels)\/(\d+)/)
    const currentId = idMatch?.[2]
    
    // 匹配当前路由
    let matchedRoute = routeConfig[path]
    
    // 处理带参数的路由
    if (!matchedRoute) {
      if (path.match(/^\/hotels\/edit\/\d+$/)) {
        matchedRoute = routeConfig['/hotels/edit/:id']
      } else if (path.match(/^\/hotels\/\d+\/stats$/)) {
        matchedRoute = routeConfig['/hotels/:id/stats']
      } else if (path.match(/^\/hotels\/\d+$/)) {
        matchedRoute = routeConfig['/hotels/:id']
      } else if (path.match(/^\/audit\/\d+$/)) {
        matchedRoute = routeConfig['/audit/:id']
      } else if (path.match(/^\/admin-hotels\/\d+\/stats$/)) {
        matchedRoute = routeConfig['/admin-hotels/:id/stats']
      } else if (path.match(/^\/admin-hotels\/\d+$/)) {
        matchedRoute = routeConfig['/admin-hotels/:id']
      } else if (path.match(/^\/merchants\/\d+$/)) {
        matchedRoute = routeConfig['/merchants/:id']
      }
    }
    
    if (!matchedRoute) return []
    
    const items = []
    
    // 始终添加首页
    items.push({
      title: <a onClick={() => navigate('/')} style={{ color: '#666' }}><HomeOutlined /> {t('route.dashboard')}</a>
    })
    
    // 添加父级
    if (matchedRoute.parent) {
      const parentRoute = routeConfig[matchedRoute.parent]
      if (parentRoute) {
        const parentPath = matchedRoute.parent.includes(':id') && currentId
          ? matchedRoute.parent.replace(':id', currentId)
          : matchedRoute.parent
        items.push({
          title: <a onClick={() => navigate(parentPath)} style={{ color: '#666' }}>{t(parentRoute.titleKey)}</a>
        })
      }
    }
    
    // 添加当前页
    items.push({ title: <span style={{ color: '#1890ff', fontWeight: 500 }}>{t(matchedRoute.titleKey)}</span> })
    
    return items
  }, [location.pathname, navigate, t])
  
  // 只有首页时不显示面包屑
  if (breadcrumbItems.length <= 1) return null
  
  return (
    <Breadcrumb 
      style={{ marginBottom: 20, fontSize: 14 }} 
      items={breadcrumbItems}
      separator={<span style={{ color: '#999', margin: '0 4px' }}>/</span>}
    />
  )
}

function RequireAuth({ token }) {
  const location = useLocation()
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

function RequireRole({ role, allow }) {
  const location = useLocation()
  if (allow && role !== allow) {
    return <Navigate to="/unauthorized" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

function Unauthorized({ homePath }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  return (
    <Result
      status="403"
      title={t('error.unauthorized')}
      subTitle={t('error.unauthorizedDesc')}
      extra={<Button type="primary" onClick={() => navigate(homePath)}>{t('common.back')}</Button>}
    />
  )
}

function NotFound({ homePath }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  return (
    <Result
      status="404"
      title={t('error.notFound')}
      subTitle={t('error.notFoundDesc')}
      extra={<Button type="primary" onClick={() => navigate(homePath)}>{t('common.back')}</Button>}
    />
  )
}

function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  
  const handleChange = (lng) => {
    i18n.changeLanguage(lng)
  }
  
  return (
    <Select
      value={i18n.language}
      onChange={handleChange}
      variant="borderless"
      size="small"
      style={{ width: 100 }}
      suffixIcon={<GlobalOutlined />}
      options={[
        { value: 'zh-CN', label: t('common.languageZh') },
        { value: 'en-US', label: t('common.languageEn') }
      ]}
    />
  )
}

function AppLayout({ auth, menuItems, selectedKey, pendingTotal, adminTooltipTitle, unreadCount, onLogout, onAdminNotificationClick }) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const { t } = useTranslation()
  return (
    <Layout className="app">
      <Layout.Sider width={220} collapsedWidth={72} collapsible collapsed={collapsed} trigger={null} className="sider">
        <div className="logo">{collapsed ? t('brand.name') : t('brand.adminName')}</div>
        <Menu
          theme="dark"
          mode="inline"
          inlineCollapsed={collapsed}
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => {
            if (key === 'hotels') navigate('/hotels')
            else if (key === 'admin-hotels') navigate('/admin-hotels')
            else if (key === 'audit') navigate('/audit')
            else if (key === 'requests') navigate('/requests')
            else if (key === 'messages') navigate('/messages')
            else if (key === 'merchants') navigate('/merchants')
            else if (key === 'account') navigate('/account')
            else navigate('/')
          }}
        />
      </Layout.Sider>
      <Layout>
        <Layout.Header className="header">
          <Space size={12} align="center" style={{ display: 'flex', alignItems: 'center' }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined style={{ fontSize: 16 }} /> : <MenuFoldOutlined style={{ fontSize: 16 }} />}
              onClick={() => setCollapsed((prev) => !prev)}
              style={{ height: 32, width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            />
            <Typography.Title level={4} className="header-title" style={{ margin: 0, lineHeight: 1 }}>
              {t('header.title')}
            </Typography.Title>
          </Space>
          <Space className="header-actions">
            <LanguageSwitcher />
            <Tooltip title={auth.role === 'admin' ? adminTooltipTitle : t('header.messageCenter')}>
              {auth.role === 'admin' ? (
                <Badge dot={pendingTotal > 0} offset={[-2, 2]}>
                  <Button 
                    type="text" 
                    size="small"
                    icon={<BellOutlined style={{ fontSize: 16 }} />} 
                    onClick={onAdminNotificationClick}
                    style={{ marginRight: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  />
                </Badge>
              ) : (
                <Badge count={unreadCount} overflowCount={99} size="small" offset={[-2, 2]}>
                  <Button 
                    type="text" 
                    size="small"
                    icon={<BellOutlined style={{ fontSize: 16 }} />} 
                    onClick={() => navigate('/messages')}
                    style={{ marginRight: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  />
                </Badge>
              )}
            </Tooltip>
            {auth.role ? <Tag color="blue">{auth.role === 'admin' ? t('role.admin') : t('role.merchant')}</Tag> : null}
            <Button size="small" onClick={onLogout}>{t('auth.logout')}</Button>
          </Space>
        </Layout.Header>
        <Layout.Content className="content">
          <AppBreadcrumb />
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  )
}

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const { i18n, t } = useTranslation()
  const [auth, setAuth] = useState(() => ({
    token: localStorage.getItem('token'),
    role: localStorage.getItem('role'),
    username: localStorage.getItem('username')
  }))
  const [unreadCount, setUnreadCount] = useState(0)
  const [adminPending, setAdminPending] = useState({ pendingHotels: 0, pendingRequests: 0 })
  const [routeNamespacesReady, setRouteNamespacesReady] = useState(false)
  
  const antdLocale = i18n.language === 'en-US' ? enUS : zhCN

  useEffect(() => {
    if (import.meta.env.DEV && appPerfStart) {
      const duration = Math.round(performance.now() - appPerfStart)
      console.info(`[perf] app-mounted ${duration}ms`)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function syncRouteNamespaces() {
      setRouteNamespacesReady(false)
      const namespaces = getRouteNamespaces(location.pathname)
      await loadNamespaces(namespaces)

      if (!cancelled) {
        setRouteNamespacesReady(true)
      }
    }

    syncRouteNamespaces().catch((error) => {
      console.error(error)
      if (!cancelled) {
        setRouteNamespacesReady(true)
      }
    })

    return () => {
      cancelled = true
    }
  }, [location.pathname, i18n.language])

  // Fetch unread count and subscribe to changes
  useEffect(() => {
    if (auth.token) {
      getUnreadCount().then(setUnreadCount)
      
      // 订阅未读数量变化
      const unsubscribe = onUnreadCountChange((count) => {
        setUnreadCount(count)
      })
      
      return unsubscribe
    }
  }, [auth.token]) // Remove location.pathname dependency as we now have real-time updates via subscription

  const fetchAdminPending = useCallback(async () => {
    if (!auth.token || auth.role !== 'admin') return
    try {
      const [hotels, requests] = await Promise.all([
        api.get('/api/admin/hotels?status=pending'),
        api.get('/api/admin/requests?status=pending')
      ])
      setAdminPending({
        pendingHotels: Array.isArray(hotels) ? hotels.length : 0,
        pendingRequests: Array.isArray(requests) ? requests.length : 0
      })
    } catch (error) {
      console.error(error)
    }
  }, [auth.role, auth.token])

  useEffect(() => {
    if (auth.token && auth.role === 'admin') {
      const initialId = setTimeout(fetchAdminPending, 0)
      const timerId = setInterval(fetchAdminPending, 30000)
      return () => {
        clearTimeout(initialId)
        clearInterval(timerId)
      }
    }
  }, [auth.token, auth.role, fetchAdminPending])

  useEffect(() => {
    if (auth.role !== 'admin') return
    const handler = () => {
      fetchAdminPending()
    }
    window.addEventListener('admin-pending-update', handler)
    return () => window.removeEventListener('admin-pending-update', handler)
  }, [auth.role, fetchAdminPending])

  const pendingTotal = adminPending.pendingHotels + adminPending.pendingRequests
  const adminTooltipTitle = (
    <div>
      <div>{t('header.pendingHotels')}：{adminPending.pendingHotels} {t('header.items')}</div>
      <div>{t('header.pendingRequests')}：{adminPending.pendingRequests} {t('header.items')}</div>
    </div>
  )
  const handleAdminNotificationClick = () => {
    if (adminPending.pendingHotels > 0) {
      navigate('/audit')
      return
    }
    if (adminPending.pendingRequests > 0) {
      navigate('/requests')
      return
    }
    navigate('/messages')
  }

  const menuItems = useMemo(() => {
    const items = [{ key: 'dashboard', icon: <HomeOutlined />, label: t('menu.dashboard') }]
    if (auth.role === 'merchant') {
      items.push({ key: 'hotels', icon: <SettingOutlined />, label: t('menu.myHotels') })
      items.push({ key: 'messages', icon: <BellOutlined />, label: t('menu.messages') })
      items.push({ key: 'account', icon: <UserOutlined />, label: t('menu.account') })
    }
    if (auth.role === 'admin') {
      items.push({ key: 'admin-hotels', icon: <ShopOutlined />, label: t('menu.hotels') })
      items.push({ key: 'audit', icon: <SettingOutlined />, label: t('menu.hotelAudit') })
      items.push({ key: 'requests', icon: <FileSearchOutlined />, label: t('menu.requestAudit') })
      items.push({ key: 'merchants', icon: <TeamOutlined />, label: t('menu.merchants') })
      items.push({ key: 'account', icon: <UserOutlined />, label: t('menu.account') })
    }
    return items
  }, [auth.role, t])

  const selectedKey = location.pathname.startsWith('/admin-hotels')
    ? 'admin-hotels'
    : location.pathname.startsWith('/hotels')
      ? 'hotels'
      : location.pathname.startsWith('/audit')
        ? 'audit'
        : location.pathname.startsWith('/requests')
          ? 'requests'
          : location.pathname.startsWith('/messages')
            ? 'messages'
            : location.pathname.startsWith('/merchants')
              ? 'merchants'
              : location.pathname.startsWith('/account')
                ? 'account'
                : 'dashboard'

  const handleLoggedIn = ({ token, role, username }) => {
    localStorage.setItem('token', token)
    localStorage.setItem('role', role)
    localStorage.setItem('username', username || '')
    setAuth({ token, role, username })
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('username')
    setAuth({ token: '', role: '', username: '' })
    navigate('/login')
  }

  const homePath = auth.role === 'admin' ? '/audit' : auth.role === 'merchant' ? '/hotels' : '/'

  if (!routeNamespacesReady) {
    return <div style={{ minHeight: '100vh' }} />
  }

  return (
    <ConfigProvider locale={antdLocale}>
      <Routes>
        <Route
          path="/login"
          element={
            auth.token
              ? <Navigate to={homePath} replace />
              : <LazyRoute><Login onLoggedIn={handleLoggedIn} /></LazyRoute>
          }
        />
        <Route element={<RequireAuth token={auth.token} />}>
          <Route
            element={
              <AppLayout
                auth={auth}
                menuItems={menuItems}
                selectedKey={selectedKey}
                pendingTotal={pendingTotal}
                adminTooltipTitle={adminTooltipTitle}
                unreadCount={unreadCount}
                onLogout={handleLogout}
                onAdminNotificationClick={handleAdminNotificationClick}
              />
            }
          >
            <Route path="/" element={<LazyRoute><Dashboard /></LazyRoute>} />
            <Route element={<RequireRole role={auth.role} allow="merchant" />}>
              <Route path="/hotels" element={<LazyRoute><Hotels /></LazyRoute>} />
              <Route path="/hotels/new" element={<LazyRoute><HotelEdit /></LazyRoute>} />
              <Route path="/hotels/edit/:id" element={<LazyRoute><HotelEdit /></LazyRoute>} />
              <Route path="/hotels/:id" element={<LazyRoute><HotelDetail /></LazyRoute>} />
              <Route path="/hotels/:id/stats" element={<LazyRoute><OrderStats /></LazyRoute>} />
            </Route>
            <Route element={<RequireRole role={auth.role} allow="admin" />}>
              <Route path="/admin-hotels" element={<LazyRoute><AdminHotels /></LazyRoute>} />
              <Route path="/admin-hotels/:id" element={<LazyRoute><AdminHotelDetail /></LazyRoute>} />
              <Route path="/admin-hotels/:id/stats" element={<LazyRoute><OrderStats /></LazyRoute>} />
              <Route path="/audit" element={<LazyRoute><Audit /></LazyRoute>} />
              <Route path="/audit/:id" element={<LazyRoute><AuditDetail /></LazyRoute>} />
              <Route path="/requests" element={<LazyRoute><RequestAudit /></LazyRoute>} />
              <Route path="/merchants" element={<LazyRoute><Merchants /></LazyRoute>} />
              <Route path="/merchants/:id" element={<LazyRoute><MerchantDetail /></LazyRoute>} />
            </Route>
            <Route path="/messages" element={<LazyRoute><Messages /></LazyRoute>} />
            <Route path="/account" element={<LazyRoute><Account /></LazyRoute>} />
            <Route path="/unauthorized" element={<Unauthorized homePath={homePath} />} />
            <Route path="*" element={<NotFound homePath={homePath} />} />
          </Route>
        </Route>
      </Routes>
    </ConfigProvider>
  )
}

export default App
