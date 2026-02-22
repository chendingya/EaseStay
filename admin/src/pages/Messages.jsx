import { Card, Typography, Tag, Empty, Badge, Tabs, Spin } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import BellOutlined from '@ant-design/icons/es/icons/BellOutlined'
import CheckCircleOutlined from '@ant-design/icons/es/icons/CheckCircleOutlined'
import CloseCircleOutlined from '@ant-design/icons/es/icons/CloseCircleOutlined'
import InfoCircleOutlined from '@ant-design/icons/es/icons/InfoCircleOutlined'
import WarningOutlined from '@ant-design/icons/es/icons/WarningOutlined'
import DeleteOutlined from '@ant-design/icons/es/icons/DeleteOutlined'
import { GlassButton, glassMessage as message } from '../components'
import { getNotifications, markAsRead as markNotificationAsRead, formatNotificationTime } from '../services'
import { useTranslation } from 'react-i18next'

const typeConfig = {
  success: { icon: <CheckCircleOutlined />, color: 'green', bg: '#f6ffed' },
  warning: { icon: <WarningOutlined />, color: 'orange', bg: '#fffbe6' },
  error: { icon: <CloseCircleOutlined />, color: 'red', bg: '#fff2f0' },
  info: { icon: <InfoCircleOutlined />, color: 'blue', bg: '#e6f7ff' }
}

export default function Messages() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = useCallback(async (unreadOnly = false) => {
    setLoading(true)
    try {
      const data = await getNotifications({ unreadOnly })
      setNotifications(data)
      setUnreadCount(data.filter(n => !n.is_read).length)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications(activeTab === 'unread')
  }, [activeTab, fetchNotifications])

  const handleMarkAsRead = async (id) => {
    const success = await markNotificationAsRead(id)
    if (success) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  const handleMarkAllAsRead = async () => {
    setLoading(true)
    try {
      const success = await markNotificationAsRead()
      if (success) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
        message.success(t('messages.markAllSuccess'))
      }
    } catch (error) {
      console.error(error)
      message.error(t('messages.markAllError'))
    } finally {
      setLoading(false)
    }
  }

  const displayList = activeTab === 'unread' 
    ? notifications.filter(n => !n.is_read)
    : notifications

  const tabItems = [
    { 
      key: 'all', 
      label: t('messages.tabs.all') 
    },
    { 
      key: 'unread', 
      label: (
        <span>
          {t('messages.tabs.unread')}
          {unreadCount > 0 && <Badge count={unreadCount} size="small" style={{ marginLeft: 8 }} />}
        </span>
      )
    }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          <BellOutlined /> {t('messages.title')}
          {unreadCount > 0 && (
            <Badge count={unreadCount} style={{ marginLeft: 12 }} />
          )}
        </Typography.Title>
        {unreadCount > 0 && (
          <GlassButton onClick={handleMarkAllAsRead} loading={loading}>
            {t('messages.markAll')}
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

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin />
          </div>
        ) : displayList.length === 0 ? (
          <Empty description={t('messages.empty')} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {displayList.map((item) => {
              const config = typeConfig[item.type] || typeConfig.info
              return (
                <div
                  key={item.id}
                  style={{ 
                    background: item.is_read ? '#fff' : config.bg,
                    borderRadius: 8,
                    padding: '12px 16px',
                    border: `1px solid ${item.is_read ? '#f0f0f0' : 'transparent'}`,
                    transition: 'all 0.3s',
                    cursor: item.is_read ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12
                  }}
                  onClick={() => !item.is_read && handleMarkAsRead(item.id)}
                >
                  <div style={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: '50%',
                    background: config.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    flexShrink: 0,
                    color: config.color === 'green' ? '#52c41a' 
                         : config.color === 'orange' ? '#faad14'
                         : config.color === 'red' ? '#ff4d4f'
                         : '#1890ff'
                  }}>
                    {config.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: item.is_read ? 'normal' : 600 }}>
                        {item.title}
                      </span>
                      {!item.is_read && (
                        <Tag color="blue">{t('messages.unreadTag')}</Tag>
                      )}
                    </div>
                    <div style={{ color: '#666', marginBottom: 4 }}>{item.content}</div>
                    <div style={{ color: '#999', fontSize: 12 }}>{formatNotificationTime(item.created_at)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
