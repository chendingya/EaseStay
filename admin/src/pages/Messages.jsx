import { Badge, Card, Empty, Pagination, Spin, Tabs, Tag, Typography } from 'antd'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import BellOutlined from '@ant-design/icons/es/icons/BellOutlined'
import CheckCircleOutlined from '@ant-design/icons/es/icons/CheckCircleOutlined'
import CloseCircleOutlined from '@ant-design/icons/es/icons/CloseCircleOutlined'
import InfoCircleOutlined from '@ant-design/icons/es/icons/InfoCircleOutlined'
import WarningOutlined from '@ant-design/icons/es/icons/WarningOutlined'
import { GlassButton, glassMessage as message } from '../components'
import { getNotifications, formatNotificationTime } from '../services'
import { useTranslation } from 'react-i18next'
import { useNotificationStore } from '../stores'

const PAGE_SIZE = 12

const typeConfig = {
  success: { icon: <CheckCircleOutlined />, color: 'green', bg: '#f6ffed' },
  warning: { icon: <WarningOutlined />, color: 'orange', bg: '#fffbe6' },
  error: { icon: <CloseCircleOutlined />, color: 'red', bg: '#fff2f0' },
  info: { icon: <InfoCircleOutlined />, color: 'blue', bg: '#e6f7ff' }
}

const iconColorMap = {
  green: '#52c41a',
  orange: '#faad14',
  red: '#ff4d4f',
  blue: '#1890ff'
}

const NotificationItem = memo(function NotificationItem({ item, unreadTagText, onMarkAsRead }) {
  const config = typeConfig[item.type] || typeConfig.info
  const timeText = useMemo(() => formatNotificationTime(item.created_at), [item.created_at])

  const handleClick = useCallback(() => {
    if (!item.is_read) onMarkAsRead(item.id)
  }, [item.id, item.is_read, onMarkAsRead])

  return (
    <div
      role={item.is_read ? undefined : 'button'}
      tabIndex={item.is_read ? -1 : 0}
      style={{
        background: item.is_read ? '#fff' : config.bg,
        borderRadius: 8,
        padding: '12px 16px',
        border: `1px solid ${item.is_read ? '#f0f0f0' : 'transparent'}`,
        transition: 'background-color 0.2s, border-color 0.2s',
        cursor: item.is_read ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        contentVisibility: 'auto',
        containIntrinsicSize: '72px'
      }}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (!item.is_read && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          onMarkAsRead(item.id)
        }
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: config.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          flexShrink: 0,
          color: iconColorMap[config.color] || iconColorMap.blue
        }}
      >
        {config.icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontWeight: item.is_read ? 'normal' : 600 }}>
            {item.title}
          </span>
          {!item.is_read && (
            <Tag color="blue">{unreadTagText}</Tag>
          )}
        </div>
        <div style={{ color: '#666', marginBottom: 4 }}>{item.content}</div>
        <div style={{ color: '#999', fontSize: 12 }}>{timeText}</div>
      </div>
    </div>
  )
})

export default function Messages() {
  const { t } = useTranslation()
  const refreshUnreadCount = useNotificationStore((state) => state.refreshUnreadCount)
  const markNotificationAsRead = useNotificationStore((state) => state.markAsRead)
  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [markAllLoading, setMarkAllLoading] = useState(false)

  useEffect(() => {
    let canceled = false

    const fetchNotifications = async () => {
      setLoading(true)
      try {
        const data = await getNotifications()
        if (!canceled) setNotifications(data)
        await refreshUnreadCount()
      } catch (error) {
        console.error(error)
      } finally {
        if (!canceled) setLoading(false)
      }
    }

    fetchNotifications()

    return () => {
      canceled = true
    }
  }, [refreshUnreadCount])

  const unreadCount = useMemo(
    () => notifications.reduce((sum, item) => sum + (item?.is_read ? 0 : 1), 0),
    [notifications]
  )

  const displayList = useMemo(
    () => (activeTab === 'unread' ? notifications.filter((item) => !item.is_read) : notifications),
    [activeTab, notifications]
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(displayList.length / PAGE_SIZE))
    if (currentPage > maxPage) {
      setCurrentPage(maxPage)
    }
  }, [currentPage, displayList.length])

  const pagedList = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return displayList.slice(start, start + PAGE_SIZE)
  }, [currentPage, displayList])

  const handleMarkAsRead = useCallback(async (id) => {
    const success = await markNotificationAsRead(id)
    if (!success) return
    setNotifications((prev) => prev.map((item) => (
      item.id === id ? { ...item, is_read: true } : item
    )))
  }, [])

  const handleMarkAllAsRead = async () => {
    setMarkAllLoading(true)
    try {
      const success = await markNotificationAsRead()
      if (success) {
        setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })))
        message.success(t('messages.markAllSuccess'))
      }
    } catch (error) {
      console.error(error)
      message.error(t('messages.markAllError'))
    } finally {
      setMarkAllLoading(false)
    }
  }

  const tabItems = useMemo(() => ([
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
  ]), [t, unreadCount])

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
          <GlassButton onClick={handleMarkAllAsRead} loading={markAllLoading}>
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
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pagedList.map((item) => (
                <NotificationItem
                  key={item.id}
                  item={item}
                  unreadTagText={t('messages.unreadTag')}
                  onMarkAsRead={handleMarkAsRead}
                />
              ))}
            </div>
            {displayList.length > PAGE_SIZE && (
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <Pagination
                  current={currentPage}
                  pageSize={PAGE_SIZE}
                  total={displayList.length}
                  onChange={setCurrentPage}
                  showSizeChanger={false}
                />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
