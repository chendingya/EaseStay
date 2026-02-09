import './App.css'
import { Layout, Menu, Space, Typography, Tag, Button, Breadcrumb, Badge, Tooltip, Result } from 'antd'
import { HomeOutlined, SettingOutlined, UserOutlined, TeamOutlined, BellOutlined, FileSearchOutlined, ShopOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import { Routes, Route, useLocation, useNavigate, Navigate, Outlet } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getUnreadCount, onUnreadCountChange, api } from './services'
import Login from './pages/Login.jsx'
import Hotels from './pages/Hotels.jsx'
import HotelDetail from './pages/HotelDetail.jsx'
import HotelEdit from './pages/HotelEdit.jsx'
import Audit from './pages/Audit.jsx'
import AuditDetail from './pages/AuditDetail.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Account from './pages/Account.jsx'
import Merchants from './pages/Merchants.jsx'
import RequestAudit from './pages/RequestAudit.jsx'
import Messages from './pages/Messages.jsx'
import AdminHotels from './pages/AdminHotels.jsx'
import AdminHotelDetail from './pages/AdminHotelDetail.jsx'
import MerchantDetail from './pages/MerchantDetail.jsx'
import OrderStats from './pages/OrderStats.jsx'
import { routeConfig } from './routes/routeConfig'

const appPerfStart = import.meta.env.DEV ? performance.now() : 0

// 面包屑组件
function AppBreadcrumb() {
  const location = useLocation()
  const navigate = useNavigate()
  
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
      title: <a onClick={() => navigate('/')} style={{ color: '#666' }}><HomeOutlined /> 首页</a>
    })
    
    // 添加父级
    if (matchedRoute.parent) {
      const parentRoute = routeConfig[matchedRoute.parent]
      if (parentRoute) {
        const parentPath = matchedRoute.parent.includes(':id') && currentId
          ? matchedRoute.parent.replace(':id', currentId)
          : matchedRoute.parent
        items.push({
          title: <a onClick={() => navigate(parentPath)} style={{ color: '#666' }}>{parentRoute.title}</a>
        })
      }
    }
    
    // 添加当前页
    items.push({ title: <span style={{ color: '#1890ff', fontWeight: 500 }}>{matchedRoute.title}</span> })
    
    return items
  }, [location.pathname, navigate])
  
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
  return (
    <Result
      status="403"
      title="无权访问"
      subTitle="当前账号无权限访问该页面"
      extra={<Button type="primary" onClick={() => navigate(homePath)}>返回首页</Button>}
    />
  )
}

function NotFound({ homePath }) {
  const navigate = useNavigate()
  return (
    <Result
      status="404"
      title="页面不存在"
      subTitle="访问的页面不存在或已被移动"
      extra={<Button type="primary" onClick={() => navigate(homePath)}>返回首页</Button>}
    />
  )
}

function AppLayout({ auth, menuItems, selectedKey, pendingTotal, adminTooltipTitle, unreadCount, onLogout, onAdminNotificationClick }) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  return (
    <Layout className="app">
      <Layout.Sider width={220} collapsedWidth={72} collapsible collapsed={collapsed} trigger={null} className="sider">
        <div className="logo">{collapsed ? '易宿' : '易宿管理端'}</div>
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
              酒店管理后台
            </Typography.Title>
          </Space>
          <Space className="header-actions">
            <Tooltip title={auth.role === 'admin' ? adminTooltipTitle : '消息中心'}>
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
            {auth.role ? <Tag color="blue">{auth.role === 'admin' ? '管理员' : '商户'}</Tag> : null}
            <Button size="small" onClick={onLogout}>退出登录</Button>
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
  const [auth, setAuth] = useState(() => ({
    token: localStorage.getItem('token'),
    role: localStorage.getItem('role'),
    username: localStorage.getItem('username')
  }))
  const [unreadCount, setUnreadCount] = useState(0)
  const [adminPending, setAdminPending] = useState({ pendingHotels: 0, pendingRequests: 0 })

  useEffect(() => {
    if (import.meta.env.DEV && appPerfStart) {
      const duration = Math.round(performance.now() - appPerfStart)
      console.info(`[perf] app-mounted ${duration}ms`)
    }
  }, [])

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
      console.error('获取待审核汇总失败:', error)
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
      <div>待审核酒店：{adminPending.pendingHotels} 条</div>
      <div>待审核申请：{adminPending.pendingRequests} 条</div>
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
    const items = [{ key: 'dashboard', icon: <HomeOutlined />, label: '工作台' }]
    if (auth.role === 'merchant') {
      items.push({ key: 'hotels', icon: <SettingOutlined />, label: '我的酒店' })
      items.push({ key: 'messages', icon: <BellOutlined />, label: '消息中心' })
      items.push({ key: 'account', icon: <UserOutlined />, label: '账户管理' })
    }
    if (auth.role === 'admin') {
      items.push({ key: 'admin-hotels', icon: <ShopOutlined />, label: '酒店管理' })
      items.push({ key: 'audit', icon: <SettingOutlined />, label: '酒店审核' })
      items.push({ key: 'requests', icon: <FileSearchOutlined />, label: '申请审核' })
      items.push({ key: 'merchants', icon: <TeamOutlined />, label: '商户管理' })
      items.push({ key: 'account', icon: <UserOutlined />, label: '账户管理' })
    }
    return items
  }, [auth.role])

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

  return (
    <Routes>
      <Route path="/login" element={auth.token ? <Navigate to={homePath} replace /> : <Login onLoggedIn={handleLoggedIn} />} />
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
          <Route path="/" element={<Dashboard />} />
          <Route element={<RequireRole role={auth.role} allow="merchant" />}>
            <Route path="/hotels" element={<Hotels />} />
            <Route path="/hotels/new" element={<HotelEdit />} />
            <Route path="/hotels/edit/:id" element={<HotelEdit />} />
            <Route path="/hotels/:id" element={<HotelDetail />} />
            <Route path="/hotels/:id/stats" element={<OrderStats />} />
          </Route>
          <Route element={<RequireRole role={auth.role} allow="admin" />}>
            <Route path="/admin-hotels" element={<AdminHotels />} />
            <Route path="/admin-hotels/:id" element={<AdminHotelDetail />} />
            <Route path="/admin-hotels/:id/stats" element={<OrderStats />} />
            <Route path="/audit" element={<Audit />} />
            <Route path="/audit/:id" element={<AuditDetail />} />
            <Route path="/requests" element={<RequestAudit />} />
            <Route path="/merchants" element={<Merchants />} />
            <Route path="/merchants/:id" element={<MerchantDetail />} />
          </Route>
          <Route path="/messages" element={<Messages />} />
          <Route path="/account" element={<Account />} />
          <Route path="/unauthorized" element={<Unauthorized homePath={homePath} />} />
          <Route path="*" element={<NotFound homePath={homePath} />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
