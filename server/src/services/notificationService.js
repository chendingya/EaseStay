const { supabase } = require('../config/supabase')

/**
 * 通知服务 - 封装所有通知相关操作
 */

// 通知类型常量
const NotificationType = {
  SUCCESS: 'success',
  WARNING: 'warning',
  INFO: 'info',
  ERROR: 'error'
}

// 关联类型常量
const RelatedType = {
  HOTEL: 'hotel',
  REQUEST: 'request',
  SYSTEM: 'system'
}

/**
 * 发送通知给用户
 * @param {Object} options
 * @param {number} options.userId - 接收通知的用户ID
 * @param {string} options.title - 通知标题
 * @param {string} options.content - 通知内容
 * @param {string} options.type - 通知类型 (success/warning/info/error)
 * @param {number} [options.relatedId] - 关联的资源ID
 * @param {string} [options.relatedType] - 关联的资源类型 (hotel/request/system)
 */
const sendNotification = async ({ userId, title, content, type = NotificationType.INFO, relatedId, relatedType }) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        content,
        type,
        related_id: relatedId,
        related_type: relatedType
      })

    if (error) {
      console.error('发送通知失败:', error)
      return { ok: false, error }
    }
    return { ok: true }
  } catch (err) {
    console.error('发送通知异常:', err)
    return { ok: false, error: err }
  }
}

/**
 * 批量发送通知
 * @param {Array<Object>} notifications - 通知数组
 */
const sendNotifications = async (notifications) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert(notifications.map(n => ({
        user_id: n.userId,
        title: n.title,
        content: n.content,
        type: n.type || NotificationType.INFO,
        related_id: n.relatedId,
        related_type: n.relatedType
      })))

    if (error) {
      console.error('批量发送通知失败:', error)
      return { ok: false, error }
    }
    return { ok: true }
  } catch (err) {
    console.error('批量发送通知异常:', err)
    return { ok: false, error: err }
  }
}

/**
 * 获取用户通知列表
 * @param {Object} options
 * @param {number} options.userId - 用户ID
 * @param {boolean} [options.unreadOnly] - 仅获取未读通知
 * @param {number} [options.limit] - 限制数量
 */
const getUserNotifications = async ({ userId, unreadOnly = false, limit = 50 }) => {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data, error } = await query

    if (error) {
      return { ok: false, error }
    }
    return { ok: true, data: data || [] }
  } catch (err) {
    return { ok: false, error: err }
  }
}

/**
 * 标记通知为已读
 * @param {Object} options
 * @param {number} options.userId - 用户ID
 * @param {number} [options.notificationId] - 特定通知ID，不传则标记全部
 */
const markAsRead = async ({ userId, notificationId }) => {
  try {
    let query = supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)

    if (notificationId) {
      query = query.eq('id', notificationId)
    }

    const { error } = await query

    if (error) {
      return { ok: false, error }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err }
  }
}

/**
 * 获取未读通知数量
 * @param {number} userId - 用户ID
 */
const getUnreadCount = async (userId) => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) {
      return { ok: false, error }
    }
    return { ok: true, count: count || 0 }
  } catch (err) {
    return { ok: false, error: err }
  }
}

// 预设通知模板
const NotificationTemplates = {
  // 酒店审核通过
  hotelApproved: (hotelName, hotelId) => ({
    title: '酒店审核通过',
    content: `您的酒店「${hotelName}」已通过审核，现已上架`,
    type: NotificationType.SUCCESS,
    relatedId: hotelId,
    relatedType: RelatedType.HOTEL
  }),

  // 酒店审核驳回
  hotelRejected: (hotelName, hotelId, reason) => ({
    title: '酒店审核未通过',
    content: `您的酒店「${hotelName}」审核未通过，原因：${reason}`,
    type: NotificationType.WARNING,
    relatedId: hotelId,
    relatedType: RelatedType.HOTEL
  }),

  // 酒店已下线
  hotelOffline: (hotelName, hotelId, reason) => ({
    title: '酒店已下线',
    content: `您的酒店「${hotelName}」已被管理员下线${reason ? `，原因：${reason}` : ''}`,
    type: NotificationType.WARNING,
    relatedId: hotelId,
    relatedType: RelatedType.HOTEL
  }),

  // 酒店已恢复上架
  hotelRestored: (hotelName, hotelId) => ({
    title: '酒店已恢复上架',
    content: `您的酒店「${hotelName}」已恢复上架`,
    type: NotificationType.SUCCESS,
    relatedId: hotelId,
    relatedType: RelatedType.HOTEL
  }),

  // 申请已通过
  requestApproved: (type, name, hotelId) => ({
    title: `${type}申请已通过`,
    content: `您申请的${type}「${name}」已通过审核`,
    type: NotificationType.SUCCESS,
    relatedId: hotelId,
    relatedType: RelatedType.REQUEST
  }),

  // 申请被拒绝
  requestRejected: (type, name, hotelId, reason) => ({
    title: `${type}申请被拒绝`,
    content: `您申请的${type}「${name}」被拒绝${reason ? `，原因：${reason}` : ''}`,
    type: NotificationType.WARNING,
    relatedId: hotelId,
    relatedType: RelatedType.REQUEST
  })
}

module.exports = {
  NotificationType,
  RelatedType,
  NotificationTemplates,
  sendNotification,
  sendNotifications,
  getUserNotifications,
  markAsRead,
  getUnreadCount
}
