/**
 * 前端通知服务 - 封装所有通知相关的API调用
 */

import { api } from './request'

// 存储监听器
const listeners = []

/**
 * 监听未读数量变化
 * @param {Function} callback - 回调函数，接收新的未读数量
 * @returns {Function} 取消监听函数
 */
export const onUnreadCountChange = (callback) => {
  listeners.push(callback)
  return () => {
    const index = listeners.indexOf(callback)
    if (index > -1) listeners.splice(index, 1)
  }
}

/**
 * 触发未读数量更新通知
 */
const notifyUnreadUpdate = async () => {
  try {
    const count = await getUnreadCount()
    listeners.forEach(cb => cb(count))
  } catch (error) {
    console.error(error)
  }
}

/**
 * 获取通知列表
 * @param {Object} options
 * @param {boolean} [options.unreadOnly] - 仅获取未读通知
 * @returns {Promise<Array>} 通知列表
 */
export const getNotifications = async ({ unreadOnly = false } = {}) => {
  const query = unreadOnly ? '?unreadOnly=true' : ''
  const data = await api.get(`/api/notifications${query}`)
  return Array.isArray(data) ? data : []
}

/**
 * 获取未读通知数量
 * @returns {Promise<number>} 未读数量
 */
export const getUnreadCount = async () => {
  try {
    const data = await api.get('/api/notifications/unread-count')
    return data?.count || 0
  } catch (error) {
    console.error(error)
    return 0
  }
}

/**
 * 标记通知为已读
 * @param {number} [notificationId] - 特定通知ID，不传则标记全部
 * @returns {Promise<boolean>} 是否成功
 */
export const markAsRead = async (notificationId) => {
  try {
    const url = notificationId 
      ? `/api/notifications/${notificationId}/read`
      : '/api/notifications/read-all'
    await api.put(url)
    notifyUnreadUpdate()
    return true
  } catch (error) {
    console.error(error)
    return false
  }
}

/**
 * 删除通知
 * @param {number} notificationId - 通知ID
 * @returns {Promise<boolean>} 是否成功
 */
export const deleteNotification = async (notificationId) => {
  try {
    await api.delete(`/api/notifications/${notificationId}`)
    notifyUnreadUpdate()
    return true
  } catch (error) {
    console.error(error)
    return false
  }
}

/**
 * 通知类型配置
 */
export const NotificationTypeConfig = {
  success: { color: 'green', icon: 'CheckCircleOutlined', label: 'Success' },
  warning: { color: 'orange', icon: 'ExclamationCircleOutlined', label: 'Warning' },
  info: { color: 'blue', icon: 'InfoCircleOutlined', label: 'Info' },
  error: { color: 'red', icon: 'CloseCircleOutlined', label: 'Error' }
}

/**
 * 格式化通知时间
 * @param {string} dateString - 日期字符串
 * @returns {string} 格式化后的时间
 */
export const formatNotificationTime = (dateString) => {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US'
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  
  if (diff < 60 * 1000) {
    return rtf.format(0, 'second')
  }
  
  if (diff < 60 * 60 * 1000) {
    return rtf.format(-Math.floor(diff / 60 / 1000), 'minute')
  }
  
  if (diff < 24 * 60 * 60 * 1000) {
    return rtf.format(-Math.floor(diff / 60 / 60 / 1000), 'hour')
  }
  
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return rtf.format(-Math.floor(diff / 24 / 60 / 60 / 1000), 'day')
  }
  
  return new Intl.DateTimeFormat(locale).format(date)
}

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  deleteNotification,
  onUnreadCountChange,
  NotificationTypeConfig,
  formatNotificationTime
}
