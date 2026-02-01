const supabase = require('../config/supabase')
const { sendNotification, NotificationTemplates } = require('./notificationService')

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

// 获取所有申请（管理员） - 默认只获取 pending，可通过 status 参数筛选，可通过 hotelId 过滤
const getPendingRequests = async ({ type, status, hotelId }) => {
  let query = supabase
    .from('requests')
    .select(`
      *,
      users:merchant_id (username),
      hotels:hotel_id (name)
    `)
    .order('created_at', { ascending: false })

  // 默认只获取 pending 状态，如果传入 status=all 则获取全部
  if (status && status !== 'all') {
    query = query.eq('status', status)
  } else if (!status) {
    query = query.eq('status', 'pending')
  }

  if (type) query = query.eq('type', type)
  if (hotelId) query = query.eq('hotel_id', hotelId)

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

  // 使用通知服务发送通知给商家
  const typeLabel = getTypeLabel(request.type)
  const notification = action === 'approve'
    ? NotificationTemplates.requestApproved(typeLabel, request.name, request.hotel_id)
    : NotificationTemplates.requestRejected(typeLabel, request.name, request.hotel_id, rejectReason)

  await sendNotification({
    userId: request.merchant_id,
    ...notification
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

module.exports = {
  createRequest,
  getMerchantRequests,
  getPendingRequests,
  reviewRequest
}
