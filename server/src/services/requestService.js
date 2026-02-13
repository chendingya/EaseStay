const supabase = require('../config/supabase')
const { sendNotification, NotificationTemplates } = require('./notificationService')
const { applyPromotionsToRooms } = require('./hotelService')

const allowedRequestTypes = ['facility', 'room_type', 'promotion', 'hotel_delete']

const normalizeArray = (val) => Array.isArray(val) ? val.filter((item) => item !== undefined && item !== null) : []

const createRequest = async ({ merchantId, hotelId, type, name, data }) => {
  if (!type) {
    return { ok: false, status: 400, message: 'type 为必填项' }
  }
  if (!allowedRequestTypes.includes(type)) {
    return { ok: false, status: 400, message: 'type 不合法' }
  }
  if (type !== 'hotel_delete' && !name) {
    return { ok: false, status: 400, message: 'name 为必填项' }
  }

  let finalName = name
  let finalData = data || {}
  if (type === 'hotel_delete') {
    if (!hotelId) {
      return { ok: false, status: 400, message: 'hotelId 为必填项' }
    }
    const { data: hotel, error: hotelError } = await supabase
      .from('hotels')
      .select('id, name, merchant_id')
      .eq('id', hotelId)
      .single()

    if (hotelError || !hotel) {
      return { ok: false, status: 404, message: '酒店不存在' }
    }
    if (hotel.merchant_id !== merchantId) {
      return { ok: false, status: 403, message: '无权操作该酒店' }
    }
    const { data: pendingDelete } = await supabase
      .from('requests')
      .select('id')
      .eq('hotel_id', hotelId)
      .eq('type', 'hotel_delete')
      .eq('status', 'pending')

    if (pendingDelete && pendingDelete.length > 0) {
      return { ok: false, status: 400, message: '该酒店已有删除申请在审核中' }
    }
    const { error: updateHotelError } = await supabase
      .from('hotels')
      .update({
        status: 'offline',
        reject_reason: '申请删除中'
      })
      .eq('id', hotelId)

    if (updateHotelError) {
      return { ok: false, status: 500, message: '更新酒店状态失败：' + updateHotelError.message }
    }
    finalName = hotel.name
    finalData = { ...(data || {}), hotelName: hotel.name }
  }

  const { data: request, error } = await supabase
    .from('requests')
    .insert({
      merchant_id: merchantId,
      hotel_id: hotelId || null,
      type,
      name: finalName,
      data: finalData,
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

// 管理员获取待审核统计
const getAdminPendingSummary = async () => {
  const { count: hotelCount, error: hotelError } = await supabase
    .from('hotels')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  if (hotelError) {
    return { ok: false, status: 500, message: '获取待审核酒店数量失败：' + hotelError.message }
  }

  const { count: requestCount, error: requestError } = await supabase
    .from('requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  if (requestError) {
    return { ok: false, status: 500, message: '获取待审核申请数量失败：' + requestError.message }
  }

  return {
    ok: true,
    status: 200,
    data: {
      pendingHotels: hotelCount || 0,
      pendingRequests: requestCount || 0
    }
  }
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

  if (action === 'approve' && request.type === 'hotel_delete') {
    if (!request.hotel_id) {
      return { ok: false, status: 400, message: 'hotelId 不存在' }
    }
    const { data: hotel, error: hotelError } = await supabase
      .from('hotels')
      .select('id, name, merchant_id')
      .eq('id', request.hotel_id)
      .single()

    if (hotelError || !hotel) {
      return { ok: false, status: 404, message: '酒店不存在' }
    }
    if (hotel.merchant_id !== request.merchant_id) {
      return { ok: false, status: 403, message: '无权操作该酒店' }
    }

    await supabase
      .from('requests')
      .update({ hotel_id: null })
      .eq('hotel_id', hotel.id)
      .neq('id', requestId)

    await supabase
      .from('room_types')
      .delete()
      .eq('hotel_id', hotel.id)

    await supabase
      .from('orders')
      .delete()
      .eq('hotel_id', hotel.id)

    const { error: deleteError } = await supabase
      .from('hotels')
      .delete()
      .eq('id', hotel.id)

    if (deleteError) {
      return { ok: false, status: 500, message: '删除酒店失败：' + deleteError.message }
    }

    const { error: updateError } = await supabase
      .from('requests')
      .update({
        status: newStatus,
        reject_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (updateError) {
      return { ok: false, status: 500, message: '更新申请状态失败' }
    }
  } else {
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
  }

  if (action === 'approve' && request.hotel_id && request.type !== 'hotel_delete') {
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
            stock: request.data?.stock || 0,
            capacity: request.data?.capacity,
            bed_width: request.data?.bed_width,
            area: request.data?.area,
            ceiling_height: request.data?.ceiling_height,
            wifi: request.data?.wifi,
            breakfast_included: request.data?.breakfast_included,
            images: normalizeArray(request.data?.images)
          })
      } else if (request.type === 'promotion') {
        const promotions = hotel.promotions || []
        const newPromotions = [...promotions, {
          type: request.data?.type || '',
          title: request.name,
          value: request.data?.value || 0
        }]
        await supabase
          .from('hotels')
          .update({
            promotions: newPromotions
          })
          .eq('id', request.hotel_id)
        
        // 自动重新计算房型价格
        await applyPromotionsToRooms(request.hotel_id, newPromotions)
      }
    }
  }

  // 使用通知服务发送通知给商家
  const typeLabel = getTypeLabel(request.type)
  const notification = request.type === 'hotel_delete'
    ? (action === 'approve'
      ? NotificationTemplates.hotelDeleteApproved(request.name, request.hotel_id)
      : NotificationTemplates.hotelDeleteRejected(request.name, request.hotel_id, rejectReason))
    : (action === 'approve'
      ? NotificationTemplates.requestApproved(typeLabel, request.name, request.hotel_id)
      : NotificationTemplates.requestRejected(typeLabel, request.name, request.hotel_id, rejectReason))

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
    promotion: '优惠',
    hotel_delete: '酒店删除'
  }
  return labels[type] || type
}

module.exports = {
  createRequest,
  getMerchantRequests,
  getPendingRequests,
  reviewRequest,
  getAdminPendingSummary
}
