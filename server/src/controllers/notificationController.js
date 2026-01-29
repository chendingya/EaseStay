const { getUserNotifications, markAsRead, getUnreadCount } = require('../services/notificationService')

// 获取用户通知列表
const getNotifications = async (req, res) => {
  const unreadOnly = req.query.unreadOnly === 'true'
  const result = await getUserNotifications({ userId: req.user.id, unreadOnly })
  
  if (!result.ok) {
    return res.status(500).json({ message: '获取通知失败' })
  }
  
  res.json(result.data)
}

// 获取未读通知数量
const getNotificationUnreadCount = async (req, res) => {
  const result = await getUnreadCount(req.user.id)
  
  if (!result.ok) {
    return res.status(500).json({ message: '获取未读数量失败' })
  }
  
  res.json({ count: result.count })
}

// 标记单条通知为已读
const markNotificationAsRead = async (req, res) => {
  const { id } = req.params
  const result = await markAsRead({ userId: req.user.id, notificationId: parseInt(id) })
  
  if (!result.ok) {
    return res.status(500).json({ message: '操作失败' })
  }
  
  res.json({ message: '已标记为已读' })
}

// 标记所有通知为已读
const markAllAsRead = async (req, res) => {
  const result = await markAsRead({ userId: req.user.id })
  
  if (!result.ok) {
    return res.status(500).json({ message: '操作失败' })
  }
  
  res.json({ message: '已全部标记为已读' })
}

module.exports = {
  getNotifications,
  getNotificationUnreadCount,
  markNotificationAsRead,
  markAllAsRead
}
