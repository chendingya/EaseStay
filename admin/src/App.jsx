import './App.css'
import { Layout, Menu, Space, Typography, Tag } from 'antd'
import { HomeOutlined, SettingOutlined } from '@ant-design/icons'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Hotels from './pages/Hotels.jsx'
import Audit from './pages/Audit.jsx'
import Dashboard from './pages/Dashboard.jsx'

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const menuItems = [
    { key: 'dashboard', icon: <HomeOutlined />, label: '工作台' },
    { key: 'hotels', icon: <SettingOutlined />, label: '酒店管理' },
    { key: 'audit', icon: <SettingOutlined />, label: '审核列表' }
  ]
  const selectedKey = location.pathname.startsWith('/hotels')
    ? 'hotels'
    : location.pathname.startsWith('/audit')
      ? 'audit'
      : 'dashboard'

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
            <Tag color="blue">管理员</Tag>
          </Space>
        </Layout.Header>
        <Layout.Content className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/hotels" element={<Hotels />} />
            <Route path="/audit" element={<Audit />} />
          </Routes>
        </Layout.Content>
      </Layout>
    </Layout>
  )
}

export default App
