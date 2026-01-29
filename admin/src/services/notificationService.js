/**
 * 前端通知服务 - 封装所有通知相关的API调用
 */

const API_BASE = 'http://127.0.0.1:4100'

/**
 * 获取认证头
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}

/**
 * 获取通知列表
 * @param {Object} options
 * @param {boolean} [options.unreadOnly] - 仅获取未读通知
 * @returns {Promise<Array>} 通知列表
 */
export const getNotifications = async ({ unreadOnly = false } = {}) => {
  try {
    const query = unreadOnly ? '?unreadOnly=true' : ''
    const response = await fetch(`${API_BASE}/api/notifications${query}`, {
      headers: getAuthHeaders()
    })
    
    if (!response.ok) {
      throw new Error('获取通知失败')
    }
    
    return await response.json()
  } catch (error) {
    console.error('获取通知失败:', error)
    return []
  }
}

/**
 * 获取未读通知数量
 * @returns {Promise<number>} 未读数量
 */
export const getUnreadCount = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/notifications/unread-count`, {
      headers: getAuthHeaders()
    })
    
    if (!response.ok) {
      return 0
    }
    
    const data = await response.json()
    return data.count || 0
  } catch (error) {
    console.error('获取未读数量失败:', error)
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
      ? `${API_BASE}/api/notifications/${notificationId}/read`
      : `${API_BASE}/api/notifications/read-all`
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: getAuthHeaders()
    })
    
    return response.ok
  } catch (error) {
    console.error('标记已读失败:', error)
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
    const response = await fetch(`${API_BASE}/api/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    
    return response.ok
  } catch (error) {
    console.error('删除通知失败:', error)
    return false
  }
}

/**
 * 通知类型配置
 */
export const NotificationTypeConfig = {
  success: { color: 'green', icon: 'CheckCircleOutlined', label: '成功' },
  warning: { color: 'orange', icon: 'ExclamationCircleOutlined', label: '警告' },
  info: { color: 'blue', icon: 'InfoCircleOutlined', label: '信息' },
  error: { color: 'red', icon: 'CloseCircleOutlined', label: '错误' }
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
  
  // 小于1分钟
  if (diff < 60 * 1000) {
    return '刚刚'
  }
  
  // 小于1小时
  if (diff < 60 * 60 * 1000) {
    return `${Math.floor(diff / 60 / 1000)}分钟前`
  }
  
  // 小于24小时
  if (diff < 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / 60 / 60 / 1000)}小时前`
  }
  
  // 小于7天
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / 24 / 60 / 60 / 1000)}天前`
  }
  
  // 其他情况显示日期
  return date.toLocaleDateString('zh-CN')
}

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  deleteNotification,
  NotificationTypeConfig,
  formatNotificationTime
}
