import './App.css'
import { Layout, Menu, Space, Typography, Tag, Button } from 'antd'
import { HomeOutlined, SettingOutlined } from '@ant-design/icons'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import Login from './pages/Login.jsx'
import Hotels from './pages/Hotels.jsx'
import HotelDetail from './pages/HotelDetail.jsx'
import HotelEdit from './pages/HotelEdit.jsx'
import Audit from './pages/Audit.jsx'
import Dashboard from './pages/Dashboard.jsx'

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [auth, setAuth] = useState(() => ({
    token: localStorage.getItem('token'),
    role: localStorage.getItem('role'),
    username: localStorage.getItem('username')
  }))

  useEffect(() => {
    if (!auth.token && location.pathname !== '/login') {
      navigate('/login')
    }
    if (auth.token && location.pathname === '/login') {
      if (auth.role === 'admin') navigate('/audit')
      else if (auth.role === 'merchant') navigate('/hotels')
      else navigate('/')
    }
    if (auth.token && auth.role === 'merchant' && location.pathname.startsWith('/audit')) {
      navigate('/hotels')
    }
    if (auth.token && auth.role === 'admin' && location.pathname.startsWith('/hotels')) {
      navigate('/audit')
    }
  }, [auth, location.pathname, navigate])

  const menuItems = useMemo(() => {
    const items = [{ key: 'dashboard', icon: <HomeOutlined />, label: '工作台' }]
    if (auth.role === 'merchant') {
      items.push({ key: 'hotels', icon: <SettingOutlined />, label: '酒店管理' })
    }
    if (auth.role === 'admin') {
      items.push({ key: 'audit', icon: <SettingOutlined />, label: '审核列表' })
    }
    return items
  }, [auth.role])

  const selectedKey = location.pathname.startsWith('/hotels')
    ? 'hotels'
    : location.pathname.startsWith('/audit')
      ? 'audit'
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
            else if (key === 'audit') navigate('/audit')
            else navigate('/')
          }}
        />
      </Layout.Sider>
      <Layout>
        <Layout.Header className="header">
          <Typography.Title level={4} className="header-title">酒店管理后台</Typography.Title>
          <Space className="header-actions">
            {auth.role ? <Tag color="blue">{auth.role === 'admin' ? '管理员' : '商户'}</Tag> : null}
            <Button size="small" onClick={handleLogout}>退出登录</Button>
          </Space>
        </Layout.Header>
        <Layout.Content className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/hotels" element={<Hotels />} />
            <Route path="/hotels/new" element={<HotelEdit />} />
            <Route path="/hotels/edit/:id" element={<HotelEdit />} />
            <Route path="/hotels/:id" element={<HotelDetail />} />
            <Route path="/audit" element={<Audit />} />
          </Routes>
        </Layout.Content>
      </Layout>
    </Layout>
  )
}

export default App
