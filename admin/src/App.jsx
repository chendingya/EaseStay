import './App.css'
import { Layout, Menu, Space, Typography, Tag, Button, Breadcrumb, Badge, Tooltip } from 'antd'
import { HomeOutlined, SettingOutlined, UserOutlined, TeamOutlined, BellOutlined, FileSearchOutlined, ShopOutlined } from '@ant-design/icons'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { getUnreadCount, onUnreadCountChange } from './services/notificationService'
import { api } from './services/request'
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

// 路由配置 - 用于生成面包屑
const routeConfig = {
  '/': { title: '工作台', icon: <HomeOutlined /> },
  '/hotels': { title: '我的酒店', icon: <SettingOutlined /> },
  '/hotels/new': { title: '新增酒店', parent: '/hotels' },
  '/hotels/edit/:id': { title: '编辑酒店', parent: '/hotels' },
  '/hotels/:id': { title: '酒店详情', parent: '/hotels' },
  '/admin-hotels': { title: '酒店管理', icon: <ShopOutlined /> },
  '/admin-hotels/:id': { title: '酒店详情', parent: '/admin-hotels' },
  '/audit': { title: '酒店审核', icon: <SettingOutlined /> },
  '/audit/:id': { title: '审核详情', parent: '/audit' },
  '/requests': { title: '申请审核', icon: <FileSearchOutlined /> },
  '/messages': { title: '消息中心', icon: <BellOutlined /> },
  '/account': { title: '账户管理', icon: <UserOutlined /> },
  '/merchants': { title: '商户管理', icon: <TeamOutlined /> },
  '/merchants/:id': { title: '商户详情', parent: '/merchants' }
}

// 面包屑组件
function AppBreadcrumb() {
  const location = useLocation()
  const navigate = useNavigate()
  
  const breadcrumbItems = useMemo(() => {
    const path = location.pathname
    
    // 匹配当前路由
    let matchedRoute = routeConfig[path]
    
    // 处理带参数的路由
    if (!matchedRoute) {
      if (path.match(/^\/hotels\/edit\/\d+$/)) {
        matchedRoute = routeConfig['/hotels/edit/:id']
      } else if (path.match(/^\/hotels\/\d+$/)) {
        matchedRoute = routeConfig['/hotels/:id']
      } else if (path.match(/^\/audit\/\d+$/)) {
        matchedRoute = routeConfig['/audit/:id']
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
        items.push({
          title: <a onClick={() => navigate(matchedRoute.parent)} style={{ color: '#666' }}>{parentRoute.title}</a>
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
    if (!auth.token && location.pathname !== '/login') {
      navigate('/login')
    }
    if (auth.token && location.pathname === '/login') {
      if (auth.role === 'admin') navigate('/audit')
      else if (auth.role === 'merchant') navigate('/hotels')
      else navigate('/')
    }
    if (auth.token && auth.role === 'merchant' && (location.pathname.startsWith('/audit') || location.pathname.startsWith('/requests') || location.pathname.startsWith('/merchants') || location.pathname.startsWith('/admin-hotels'))) {
      navigate('/hotels')
    }
  }, [auth, location.pathname, navigate])

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

  useEffect(() => {
    if (auth.token && auth.role === 'admin') {
      let timerId
      const fetchSummary = async () => {
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
      }
      fetchSummary()
      timerId = setInterval(fetchSummary, 30000)
      return () => clearInterval(timerId)
    }
  }, [auth.token, auth.role])

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

  if (location.pathname === '/login') {
    return (
      <Routes>
        <Route path="/login" element={<Login onLoggedIn={handleLoggedIn} />} />
      </Routes>
    )
  }

  return (
    <Layout className="app">
      <Layout.Sider width={220} className="sider">
        <div className="logo">易宿管理端</div>
        <Menu
          theme="dark"
          mode="inline"
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
          <Typography.Title level={4} className="header-title">酒店管理后台</Typography.Title>
          <Space className="header-actions">
            <Tooltip title={auth.role === 'admin' ? adminTooltipTitle : '消息中心'}>
              {auth.role === 'admin' ? (
                <Badge dot={pendingTotal > 0} offset={[-2, 2]}>
                  <Button 
                    type="text" 
                    size="small"
                    icon={<BellOutlined style={{ fontSize: 16 }} />} 
                    onClick={handleAdminNotificationClick}
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
            <Button size="small" onClick={handleLogout}>退出登录</Button>
          </Space>
        </Layout.Header>
        <Layout.Content className="content">
          <AppBreadcrumb />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/hotels" element={<Hotels />} />
            <Route path="/hotels/new" element={<HotelEdit />} />
            <Route path="/hotels/edit/:id" element={<HotelEdit />} />
            <Route path="/hotels/:id" element={<HotelDetail />} />
            <Route path="/admin-hotels" element={<AdminHotels />} />
            <Route path="/admin-hotels/:id" element={<AdminHotelDetail />} />
            <Route path="/audit" element={<Audit />} />
            <Route path="/audit/:id" element={<AuditDetail />} />
            <Route path="/requests" element={<RequestAudit />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/account" element={<Account />} />
            <Route path="/merchants" element={<Merchants />} />
            <Route path="/merchants/:id" element={<MerchantDetail />} />
          </Routes>
        </Layout.Content>
      </Layout>
    </Layout>
  )
}

export default App
