const supabase = require('../config/supabase')

// 创建申请
const createRequest = async ({ merchantId, hotelId, type, name, data }) => {
  if (!type || !name) {
    return { ok: false, status: 400, message: 'type 和 name 为必填项' }
  }

  const { data: request, error } = await supabase
    .from('requests')
    .insert({
      merchant_id: merchantId,
      hotel_id: hotelId || null,
      type,
      name,
      data: data || {},
      status: 'pending'
    })
    .select()
    .single()

  if (error) {
    return { ok: false, status: 500, message: '创建申请失败：' + error.message }
  }

  return { ok: true, status: 201, data: request }
}

// 获取商家的申请列表
const getMerchantRequests = async ({ merchantId, status, type }) => {
  let query = supabase
    .from('requests')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (type) query = query.eq('type', type)

  const { data, error } = await query

  if (error) {
    return { ok: false, status: 500, message: '获取申请列表失败' }
  }

  return { ok: true, data: data || [] }
}

// 获取所有待审核申请（管理员）
const getPendingRequests = async ({ type }) => {
  let query = supabase
    .from('requests')
    .select(`
      *,
      users:merchant_id (username),
      hotels:hotel_id (name)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (type) query = query.eq('type', type)

  const { data, error } = await query

  if (error) {
    return { ok: false, status: 500, message: '获取待审核申请失败' }
  }

  return { ok: true, data: data || [] }
}

// 审核申请（管理员）
const reviewRequest = async ({ requestId, action, rejectReason }) => {
  if (!['approve', 'reject'].includes(action)) {
    return { ok: false, status: 400, message: 'action 必须是 approve 或 reject' }
  }

  // 获取申请详情
  const { data: request, error: findError } = await supabase
    .from('requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (findError || !request) {
    return { ok: false, status: 404, message: '申请不存在' }
  }

  if (request.status !== 'pending') {
    return { ok: false, status: 400, message: '该申请已处理' }
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected'

  // 更新申请状态
  const { error: updateError } = await supabase
    .from('requests')
    .update({
      status: newStatus,
      reject_reason: action === 'reject' ? rejectReason : null,
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId)

  if (updateError) {
    return { ok: false, status: 500, message: '更新申请状态失败' }
  }

  // 如果批准，将内容添加到酒店
  if (action === 'approve' && request.hotel_id) {
    const { data: hotel } = await supabase
      .from('hotels')
      .select('facilities, promotions')
      .eq('id', request.hotel_id)
      .single()

    if (hotel) {
      if (request.type === 'facility') {
        const facilities = hotel.facilities || []
        if (!facilities.includes(request.name)) {
          await supabase
            .from('hotels')
            .update({ facilities: [...facilities, request.name] })
            .eq('id', request.hotel_id)
        }
      } else if (request.type === 'room_type') {
        await supabase
          .from('room_types')
          .insert({
            hotel_id: request.hotel_id,
            name: request.name,
            price: request.data?.price || 0,
            stock: request.data?.stock || 0
          })
      } else if (request.type === 'promotion') {
        const promotions = hotel.promotions || []
        await supabase
          .from('hotels')
          .update({
            promotions: [...promotions, {
              type: request.data?.type || '',
              title: request.name,
              value: request.data?.value || 0
            }]
          })
          .eq('id', request.hotel_id)
      }
    }
  }

  // 发送通知给商家
  const notificationTitle = action === 'approve'
    ? `您的${getTypeLabel(request.type)}申请已通过`
    : `您的${getTypeLabel(request.type)}申请被拒绝`

  const notificationContent = action === 'approve'
    ? `「${request.name}」已添加成功`
    : `「${request.name}」申请被拒绝${rejectReason ? `，原因：${rejectReason}` : ''}`

  await supabase
    .from('notifications')
    .insert({
      user_id: request.merchant_id,
      title: notificationTitle,
      content: notificationContent,
      type: action === 'approve' ? 'success' : 'warning',
      related_id: requestId,
      related_type: 'request'
    })

  return { ok: true, message: action === 'approve' ? '已批准' : '已拒绝' }
}

// 获取类型标签
const getTypeLabel = (type) => {
  const labels = {
    facility: '设施',
    room_type: '房型',
    promotion: '优惠'
  }
  return labels[type] || type
}

// 获取用户通知
const getUserNotifications = async ({ userId, unreadOnly }) => {
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (unreadOnly) query = query.eq('is_read', false)

  const { data, error } = await query

  if (error) {
    return { ok: false, status: 500, message: '获取通知失败' }
  }

  return { ok: true, data: data || [] }
}

// 标记通知已读
const markNotificationRead = async ({ notificationId, userId }) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', userId)

  if (error) {
    return { ok: false, status: 500, message: '更新失败' }
  }

  return { ok: true, message: '已标记为已读' }
}

// 标记所有通知已读
const markAllNotificationsRead = async ({ userId }) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) {
    return { ok: false, status: 500, message: '更新失败' }
  }

  return { ok: true, message: '已全部标记为已读' }
}

module.exports = {
  createRequest,
  getMerchantRequests,
  getPendingRequests,
  reviewRequest,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead
}
