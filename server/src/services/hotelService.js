const supabase = require('../config/supabase')

const normalizeArray = (value) => (Array.isArray(value) ? value : [])

// 批量获取酒店最低价格
const getLowestPrices = async (hotelIds) => {
  if (!hotelIds.length) return {}

  const { data: roomTypes } = await supabase
    .from('room_types')
    .select('hotel_id, price')
    .in('hotel_id', hotelIds)

  const priceMap = {}
  hotelIds.forEach((id) => {
    priceMap[id] = null
  })

  if (roomTypes) {
    roomTypes.forEach((room) => {
      if (priceMap[room.hotel_id] === null || room.price < priceMap[room.hotel_id]) {
        priceMap[room.hotel_id] = room.price
      }
    })
  }

  return priceMap
}

// 创建酒店
const createHotel = async ({ merchantId, payload }) => {
  const {
    name,
    name_en,
    address,
    city,
    star_rating,
    opening_time,
    description,
    facilities,
    images,
    nearby_attractions,
    nearby_transport,
    nearby_malls,
    promotions,
    roomTypes
  } = payload || {}

  if (!name || !address || !city) {
    return { ok: false, status: 400, message: 'name、address、city 为必填项' }
  }

  // 创建酒店
  const { data: newHotel, error: hotelError } = await supabase
    .from('hotels')
    .insert({
      merchant_id: merchantId,
      name,
      name_en: name_en || '',
      address,
      city,
      star_rating: Number(star_rating) || 0,
      opening_time: opening_time || '',
      description: description || '',
      facilities: normalizeArray(facilities),
      images: normalizeArray(images),
      nearby_attractions: normalizeArray(nearby_attractions),
      nearby_transport: normalizeArray(nearby_transport),
      nearby_malls: normalizeArray(nearby_malls),
      promotions: normalizeArray(promotions),
      status: 'pending',
      reject_reason: ''
    })
    .select()
    .single()

  if (hotelError) {
    return { ok: false, status: 500, message: '创建酒店失败：' + hotelError.message }
  }

  // 创建房型
  let createdRoomTypes = []
  if (Array.isArray(roomTypes) && roomTypes.length > 0) {
    const roomTypesToInsert = roomTypes
      .filter((room) => room && room.name)
      .map((room) => ({
        hotel_id: newHotel.id,
        name: room.name,
        price: Number(room.price) || 0,
        stock: Number(room.stock) || 0
      }))

    if (roomTypesToInsert.length > 0) {
      const { data: insertedRoomTypes } = await supabase
        .from('room_types')
        .insert(roomTypesToInsert)
        .select()

      createdRoomTypes = insertedRoomTypes || []
    }
  }

  return { ok: true, status: 201, data: { ...newHotel, roomTypes: createdRoomTypes } }
}

// 更新酒店
const updateHotel = async ({ merchantId, hotelId, payload }) => {
  // 查找酒店
  const { data: hotel, error: findError } = await supabase
    .from('hotels')
    .select('*')
    .eq('id', hotelId)
    .single()

  if (findError || !hotel) {
    return { ok: false, status: 404, message: '酒店不存在' }
  }

  if (hotel.merchant_id !== merchantId) {
    return { ok: false, status: 403, message: '无权修改该酒店' }
  }

  const {
    name,
    name_en,
    address,
    city,
    star_rating,
    opening_time,
    description,
    facilities,
    images,
    nearby_attractions,
    nearby_transport,
    nearby_malls,
    promotions,
    roomTypes
  } = payload || {}

  // 构建更新对象
  const updates = {
    status: 'pending',
    reject_reason: ''
  }

  if (name !== undefined) updates.name = name
  if (name_en !== undefined) updates.name_en = name_en
  if (address !== undefined) updates.address = address
  if (city !== undefined) updates.city = city
  if (star_rating !== undefined) updates.star_rating = Number(star_rating) || 0
  if (opening_time !== undefined) updates.opening_time = opening_time
  if (description !== undefined) updates.description = description
  if (facilities !== undefined) updates.facilities = normalizeArray(facilities)
  if (images !== undefined) updates.images = normalizeArray(images)
  if (nearby_attractions !== undefined) updates.nearby_attractions = normalizeArray(nearby_attractions)
  if (nearby_transport !== undefined) updates.nearby_transport = normalizeArray(nearby_transport)
  if (nearby_malls !== undefined) updates.nearby_malls = normalizeArray(nearby_malls)
  if (promotions !== undefined) updates.promotions = normalizeArray(promotions)

  // 更新酒店
  const { data: updatedHotel, error: updateError } = await supabase
    .from('hotels')
    .update(updates)
    .eq('id', hotelId)
    .select()
    .single()

  if (updateError) {
    return { ok: false, status: 500, message: '更新酒店失败：' + updateError.message }
  }

  // 更新房型
  if (Array.isArray(roomTypes)) {
    // 删除旧房型
    await supabase.from('room_types').delete().eq('hotel_id', hotelId)

    // 插入新房型
    const roomTypesToInsert = roomTypes
      .filter((room) => room && room.name)
      .map((room) => ({
        hotel_id: hotelId,
        name: room.name,
        price: Number(room.price) || 0,
        stock: Number(room.stock) || 0
      }))

    if (roomTypesToInsert.length > 0) {
      await supabase.from('room_types').insert(roomTypesToInsert)
    }
  }

  // 获取当前房型
  const { data: currentRoomTypes } = await supabase
    .from('room_types')
    .select('*')
    .eq('hotel_id', hotelId)

  return { ok: true, status: 200, data: { ...updatedHotel, roomTypes: currentRoomTypes || [] } }
}

// 商户酒店列表
const listMerchantHotels = async ({ merchantId, status }) => {
  let query = supabase
    .from('hotels')
    .select('*')
    .eq('merchant_id', merchantId)

  if (status) {
    query = query.eq('status', status)
  }

  const { data: hotels, error } = await query

  if (error) {
    return { ok: false, status: 500, message: '查询失败：' + error.message }
  }

  const hotelIds = hotels.map((h) => h.id)
  const priceMap = await getLowestPrices(hotelIds)

  const enriched = hotels.map((hotel) => ({
    ...hotel,
    lowestPrice: priceMap[hotel.id]
  }))

  return { ok: true, status: 200, data: enriched }
}

// 商户酒店详情
const getMerchantHotel = async ({ merchantId, hotelId }) => {
  const { data: hotel, error } = await supabase
    .from('hotels')
    .select('*')
    .eq('id', hotelId)
    .single()

  if (error || !hotel) {
    return { ok: false, status: 404, message: '酒店不存在' }
  }

  if (hotel.merchant_id !== merchantId) {
    return { ok: false, status: 403, message: '无权查看该酒店' }
  }

  const { data: roomTypes } = await supabase
    .from('room_types')
    .select('*')
    .eq('hotel_id', hotelId)

  return { ok: true, status: 200, data: { ...hotel, roomTypes: roomTypes || [] } }
}

// 管理员酒店列表
const listAdminHotels = async ({ status }) => {
  let query = supabase.from('hotels').select('*')

  if (status) {
    query = query.eq('status', status)
  }

  const { data: hotels, error } = await query

  if (error) {
    return { ok: false, status: 500, message: '查询失败：' + error.message }
  }

  const hotelIds = hotels.map((h) => h.id)
  const priceMap = await getLowestPrices(hotelIds)

  const enriched = hotels.map((hotel) => ({
    ...hotel,
    lowestPrice: priceMap[hotel.id]
  }))

  return { ok: true, status: 200, data: enriched }
}

// 更新酒店状态
const updateHotelStatus = async ({ hotelId, status, rejectReason }) => {
  const { data: hotel, error: findError } = await supabase
    .from('hotels')
    .select('*')
    .eq('id', hotelId)
    .single()

  if (findError || !hotel) {
    return { ok: false, status: 404, message: '酒店不存在' }
  }

  const allowed = ['approved', 'rejected', 'offline', 'restore']
  if (!allowed.includes(status)) {
    return { ok: false, status: 400, message: 'status 不合法' }
  }

  const updates = {}

  if (status === 'rejected') {
    if (!rejectReason) {
      return { ok: false, status: 400, message: 'rejectReason 为必填' }
    }
    updates.status = 'rejected'
    updates.reject_reason = rejectReason
  } else if (status === 'approved') {
    updates.status = 'approved'
    updates.reject_reason = ''
  } else if (status === 'offline') {
    updates.status = 'offline'
  } else if (status === 'restore') {
    updates.status = 'approved'
  }

  const { data: updatedHotel, error: updateError } = await supabase
    .from('hotels')
    .update(updates)
    .eq('id', hotelId)
    .select()
    .single()

  if (updateError) {
    return { ok: false, status: 500, message: '更新失败：' + updateError.message }
  }

  // 发送通知给商家
  const notificationTitle = status === 'approved'
    ? '酒店审核通过'
    : status === 'rejected'
    ? '酒店审核未通过'
    : status === 'offline'
    ? '酒店已下线'
    : '酒店已恢复上架'

  const notificationContent = status === 'approved'
    ? `您的酒店「${hotel.name}」已通过审核，现已上架`
    : status === 'rejected'
    ? `您的酒店「${hotel.name}」审核未通过，原因：${rejectReason}`
    : status === 'offline'
    ? `您的酒店「${hotel.name}」已被管理员下线`
    : `您的酒店「${hotel.name}」已恢复上架`

  const notificationType = status === 'approved' || status === 'restore' ? 'success' : 'warning'

  await supabase
    .from('notifications')
    .insert({
      user_id: hotel.merchant_id,
      title: notificationTitle,
      content: notificationContent,
      type: notificationType,
      related_id: hotelId,
      related_type: 'hotel'
    })

  return { ok: true, status: 200, data: updatedHotel }
}

// 公开酒店列表
const listPublicHotels = async ({ query }) => {
  const {
    city,
    keyword,
    sort,
    page = 1,
    pageSize = 10
  } = query || {}

  const normalizedPage = Math.max(Number(page) || 1, 1)
  const normalizedPageSize = Math.max(Number(pageSize) || 10, 1)
  const offset = (normalizedPage - 1) * normalizedPageSize

  let dbQuery = supabase
    .from('hotels')
    .select('*', { count: 'exact' })
    .eq('status', 'approved')

  if (city) {
    dbQuery = dbQuery.eq('city', city)
  }

  if (keyword) {
    dbQuery = dbQuery.or(`name.ilike.%${keyword}%,name_en.ilike.%${keyword}%,address.ilike.%${keyword}%`)
  }

  const { data: hotels, error, count } = await dbQuery.range(offset, offset + normalizedPageSize - 1)

  if (error) {
    return { ok: false, status: 500, message: '查询失败：' + error.message }
  }

  const hotelIds = hotels.map((h) => h.id)
  const priceMap = await getLowestPrices(hotelIds)

  let enriched = hotels.map((hotel) => ({
    ...hotel,
    lowestPrice: priceMap[hotel.id]
  }))

  // 排序
  if (sort === 'price_asc') {
    enriched.sort((a, b) => (a.lowestPrice || 0) - (b.lowestPrice || 0))
  }
  if (sort === 'score_desc') {
    enriched.sort((a, b) => (b.star_rating || 0) - (a.star_rating || 0))
  }

  return {
    ok: true,
    status: 200,
    data: {
      page: normalizedPage,
      pageSize: normalizedPageSize,
      total: count || 0,
      list: enriched
    }
  }
}

// 公开酒店详情
const getPublicHotel = async ({ hotelId }) => {
  const { data: hotel, error } = await supabase
    .from('hotels')
    .select('*')
    .eq('id', hotelId)
    .eq('status', 'approved')
    .single()

  if (error || !hotel) {
    return { ok: false, status: 404, message: '酒店不存在或未上架' }
  }

  const { data: roomTypes } = await supabase
    .from('room_types')
    .select('*')
    .eq('hotel_id', hotelId)
    .order('price', { ascending: true })

  return { ok: true, status: 200, data: { ...hotel, roomTypes: roomTypes || [] } }
}

// 管理员获取酒店详情（可查看任意状态）
const getAdminHotelDetail = async ({ hotelId }) => {
  const { data: hotel, error } = await supabase
    .from('hotels')
    .select('*')
    .eq('id', hotelId)
    .single()

  if (error || !hotel) {
    return { ok: false, status: 404, message: '酒店不存在' }
  }

  // 获取房型
  const { data: roomTypes } = await supabase
    .from('room_types')
    .select('*')
    .eq('hotel_id', hotelId)
    .order('price', { ascending: true })

  return { ok: true, status: 200, data: { ...hotel, roomTypes: roomTypes || [] } }
}

// 商户更新酒店状态（只能下线/恢复上架自己的酒店）
const updateMerchantHotelStatus = async ({ hotelId, merchantId, action }) => {
  // 首先验证该酒店属于该商户
  const { data: hotel, error: findError } = await supabase
    .from('hotels')
    .select('*')
    .eq('id', hotelId)
    .eq('merchant_id', merchantId)
    .single()

  if (findError || !hotel) {
    return { ok: false, status: 404, message: '酒店不存在或无权操作' }
  }

  // 商户只能下线已上架的酒店，或恢复已下线的酒店
  if (action === 'offline') {
    if (hotel.status !== 'approved') {
      return { ok: false, status: 400, message: '只能下线已上架的酒店' }
    }
  } else if (action === 'restore') {
    if (hotel.status !== 'offline') {
      return { ok: false, status: 400, message: '只能恢复已下线的酒店' }
    }
  } else {
    return { ok: false, status: 400, message: '无效的操作' }
  }

  const newStatus = action === 'offline' ? 'offline' : 'approved'

  const { data: updatedHotel, error: updateError } = await supabase
    .from('hotels')
    .update({ status: newStatus })
    .eq('id', hotelId)
    .select()
    .single()

  if (updateError) {
    return { ok: false, status: 500, message: '更新失败：' + updateError.message }
  }

  return { ok: true, status: 200, data: updatedHotel }
}

module.exports = {
  createHotel,
  updateHotel,
  listMerchantHotels,
  getMerchantHotel,
  listAdminHotels,
  getAdminHotelDetail,
  updateHotelStatus,
  updateMerchantHotelStatus,
  listPublicHotels,
  getPublicHotel
}
