const requestService = require('../services/requestService')

// 商家提交申请
const createRequest = async (req, res) => {
  const merchantId = req.user.id
  const { hotelId, type, name, data } = req.body

  const result = await requestService.createRequest({
    merchantId,
    hotelId,
    type,
    name,
    data
  })

  if (!result.ok) {
    return res.status(result.status).json({ message: result.message })
  }

  res.status(201).json(result.data)
}

// 商家获取自己的申请列表
const getMerchantRequests = async (req, res) => {
  const merchantId = req.user.id
  const { status, type } = req.query

  const result = await requestService.getMerchantRequests({
    merchantId,
    status,
    type
  })

  if (!result.ok) {
    return res.status(result.status).json({ message: result.message })
  }

  res.json(result.data)
}

// 管理员获取待审核申请
const getPendingRequests = async (req, res) => {
  const { type, status, hotelId } = req.query

  const result = await requestService.getPendingRequests({ type, status, hotelId })

  if (!result.ok) {
    return res.status(result.status).json({ message: result.message })
  }

  res.json(result.data)
}

// 管理员审核申请
const reviewRequest = async (req, res) => {
  const { id } = req.params
  const { action, rejectReason } = req.body

  const result = await requestService.reviewRequest({
    requestId: parseInt(id),
    action,
    rejectReason
  })

  if (!result.ok) {
    return res.status(result.status).json({ message: result.message })
  }

  res.json({ message: result.message })
}

// 获取用户通知
const getNotifications = async (req, res) => {
  const userId = req.user.id
  const { unreadOnly } = req.query

  const result = await requestService.getUserNotifications({
    userId,
    unreadOnly: unreadOnly === 'true'
  })

  if (!result.ok) {
    return res.status(result.status).json({ message: result.message })
  }

  res.json(result.data)
}

// 标记通知已读
const markNotificationRead = async (req, res) => {
  const userId = req.user.id
  const { id } = req.params

  const result = await requestService.markNotificationRead({
    notificationId: parseInt(id),
    userId
  })

  if (!result.ok) {
    return res.status(result.status).json({ message: result.message })
  }

  res.json({ message: result.message })
}

// 标记所有通知已读
const markAllNotificationsRead = async (req, res) => {
  const userId = req.user.id

  const result = await requestService.markAllNotificationsRead({ userId })

  if (!result.ok) {
    return res.status(result.status).json({ message: result.message })
  }

  res.json({ message: result.message })
}

module.exports = {
  createRequest,
  getMerchantRequests,
  getPendingRequests,
  reviewRequest,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
}
