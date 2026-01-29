import { Card, List, Typography, Tag, Empty, Badge, Tabs } from 'antd'
import { useEffect, useState } from 'react'
import { 
  BellOutlined, CheckCircleOutlined, CloseCircleOutlined, 
  InfoCircleOutlined, WarningOutlined, DeleteOutlined
} from '@ant-design/icons'
import { GlassButton, glassMessage as message } from '../components/GlassUI'

const apiBase = 'http://127.0.0.1:4100'

const typeConfig = {
  success: { icon: <CheckCircleOutlined />, color: 'green', bg: '#f6ffed' },
  warning: { icon: <WarningOutlined />, color: 'orange', bg: '#fffbe6' },
  error: { icon: <CloseCircleOutlined />, color: 'red', bg: '#fff2f0' },
  info: { icon: <InfoCircleOutlined />, color: 'blue', bg: '#e6f7ff' }
}

export default function Messages() {
  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = async (unreadOnly = false) => {
    const token = localStorage.getItem('token')
    if (!token) return
    setLoading(true)
    try {
      const query = unreadOnly ? '?unreadOnly=true' : ''
      const response = await fetch(`${apiBase}/api/requests/notifications${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      if (!response.ok) {
        message.error(data.message || '获取消息失败')
        return
      }
      setNotifications(data)
      setUnreadCount(data.filter(n => !n.is_read).length)
    } catch {
      message.error('获取消息失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications(activeTab === 'unread')
  }, [activeTab])

  const markAsRead = async (id) => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const response = await fetch(`${apiBase}/api/requests/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch {
      // ignore
    }
  }

  const markAllAsRead = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    setLoading(true)
    try {
      const response = await fetch(`${apiBase}/api/requests/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
        message.success('已全部标记为已读')
      }
    } catch {
      message.error('操作失败')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return date.toLocaleDateString()
  }

  const displayList = activeTab === 'unread' 
    ? notifications.filter(n => !n.is_read)
    : notifications

  const tabItems = [
    { 
      key: 'all', 
      label: '全部消息' 
    },
    { 
      key: 'unread', 
      label: (
        <span>
          未读消息
          {unreadCount > 0 && <Badge count={unreadCount} size="small" style={{ marginLeft: 8 }} />}
        </span>
      )
    }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          <BellOutlined /> 消息中心
          {unreadCount > 0 && (
            <Badge count={unreadCount} style={{ marginLeft: 12 }} />
          )}
        </Typography.Title>
        {unreadCount > 0 && (
          <GlassButton onClick={markAllAsRead} loading={loading}>
            全部标记已读
          </GlassButton>
        )}
      </div>

      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={tabItems}
          style={{ marginBottom: 16 }}
        />

        <List
          loading={loading}
          dataSource={displayList}
          locale={{ emptyText: <Empty description="暂无消息" /> }}
          renderItem={(item) => {
            const config = typeConfig[item.type] || typeConfig.info
            return (
              <List.Item
                style={{ 
                  background: item.is_read ? '#fff' : config.bg,
                  marginBottom: 8,
                  borderRadius: 8,
                  padding: '12px 16px',
                  border: `1px solid ${item.is_read ? '#f0f0f0' : 'transparent'}`,
                  transition: 'all 0.3s'
                }}
                onClick={() => !item.is_read && markAsRead(item.id)}
              >
                <List.Item.Meta
                  avatar={
                    <div style={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: '50%',
                      background: config.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      color: config.color === 'green' ? '#52c41a' 
                           : config.color === 'orange' ? '#faad14'
                           : config.color === 'red' ? '#ff4d4f'
                           : '#1890ff'
                    }}>
                      {config.icon}
                    </div>
                  }
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: item.is_read ? 'normal' : 600 }}>
                        {item.title}
                      </span>
                      {!item.is_read && (
                        <Tag color="blue" style={{ marginLeft: 8 }}>未读</Tag>
                      )}
                    </div>
                  }
                  description={
                    <div>
                      <div style={{ color: '#666', marginBottom: 4 }}>{item.content}</div>
                      <div style={{ color: '#999', fontSize: 12 }}>{formatTime(item.created_at)}</div>
                    </div>
                  }
                />
              </List.Item>
            )
          }}
        />
      </Card>
    </div>
  )
}
