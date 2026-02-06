const supabase = require('../config/supabase')
const { sendNotification, NotificationTemplates } = require('./notificationService')

const normalizeArray = (value) => (Array.isArray(value) ? value : [])
const normalizeNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0)

const filterHotelIdsByMerchant = async ({ hotelIds, merchantId }) => {
  if (!merchantId) {
    return { ok: true, status: 200, data: hotelIds }
  }
  if (!hotelIds.length) {
    return { ok: true, status: 200, data: [] }
  }
  const { data, error } = await supabase
    .from('hotels')
    .select('id')
    .in('id', hotelIds)
    .eq('merchant_id', merchantId)

  if (error) {
    return { ok: false, status: 500, message: '校验酒店失败：' + error.message }
  }

  return { ok: true, status: 200, data: (data || []).map((item) => item.id) }
}

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

const getRoomTypeStatsByHotelIds = async (hotelIds) => {
  if (!hotelIds.length) {
    return { ok: true, status: 200, data: [] }
  }

  const { data: roomTypes, error } = await supabase
    .from('room_types')
    .select('*')
    .in('hotel_id', hotelIds)

  if (error) {
    return { ok: false, status: 500, message: '获取房型统计失败：' + error.message }
  }

  const statsMap = {}

  ;(roomTypes || []).forEach((room) => {
    const name = room.name || '未知房型'
    const stock = normalizeNumber(room.stock)
    const used = normalizeNumber(room.used_stock)
    const offline = normalizeNumber(room.offline_stock)
    const available = Math.max(stock - used - offline, 0)

    if (!statsMap[name]) {
      statsMap[name] = { name, stock: 0, used: 0, offline: 0, available: 0 }
    }

    statsMap[name].stock += stock
    statsMap[name].used += used
    statsMap[name].offline += offline
    statsMap[name].available += available
  })

  const list = Object.values(statsMap).sort((a, b) => a.name.localeCompare(b.name))
  return { ok: true, status: 200, data: list }
}

const batchSetRoomDiscount = async ({ hotelIds, roomTypeName, quantity, discount, merchantId }) => {
  if (!hotelIds.length) {
    return { ok: false, status: 400, message: 'hotelIds 不能为空' }
  }
  if (!roomTypeName) {
    return { ok: false, status: 400, message: 'roomTypeName 不能为空' }
  }

  const filteredResult = await filterHotelIdsByMerchant({ hotelIds, merchantId })
  if (!filteredResult.ok) {
    return filteredResult
  }
  const filteredHotelIds = filteredResult.data || []
  if (!filteredHotelIds.length) {
    return { ok: false, status: 403, message: '无权操作该酒店' }
  }

  const normalizedDiscount = normalizeNumber(discount)
  const normalizedQuantity = Math.max(normalizeNumber(quantity), 0)

  if (normalizedDiscount < 0 || normalizedDiscount > 10) {
    return { ok: false, status: 400, message: 'discount 取值应为 0-10' }
  }

  const { data: roomTypes, error } = await supabase
    .from('room_types')
    .select('*')
    .in('hotel_id', filteredHotelIds)
    .eq('name', roomTypeName)

  if (error) {
    return { ok: false, status: 500, message: '批量折扣失败：' + error.message }
  }

  const isCancel = normalizedDiscount === 0
  const updates = await Promise.all(
    (roomTypes || []).map(async (room) => {
      const stock = normalizeNumber(room.stock)
      const used = normalizeNumber(room.used_stock)
      const offline = normalizeNumber(room.offline_stock)
      const available = Math.max(stock - used - offline, 0)
      const quota = isCancel ? 0 : (normalizedQuantity > 0 ? Math.min(normalizedQuantity, available) : 0)

      const { data: updated, error: updateError } = await supabase
        .from('room_types')
        .update({
          discount_rate: isCancel ? 0 : normalizedDiscount,
          discount_quota: quota
        })
        .eq('id', room.id)
        .select()
        .single()

      if (updateError) {
        return { ok: false, message: updateError.message }
      }
      return { ok: true, data: updated }
    })
  )

  const successCount = updates.filter((item) => item.ok).length
  return { ok: true, status: 200, data: { successCount, total: roomTypes?.length || 0 } }
}

const batchRoomOperation = async ({ hotelIds, roomTypeName, action, quantity, stock, merchantId }) => {
  if (!hotelIds.length) {
    return { ok: false, status: 400, message: 'hotelIds 不能为空' }
  }
  if (!roomTypeName) {
    return { ok: false, status: 400, message: 'roomTypeName 不能为空' }
  }
  if (!['offline', 'adjust_stock'].includes(action)) {
    return { ok: false, status: 400, message: 'action 不合法' }
  }

  const filteredResult = await filterHotelIdsByMerchant({ hotelIds, merchantId })
  if (!filteredResult.ok) {
    return filteredResult
  }
  const filteredHotelIds = filteredResult.data || []
  if (!filteredHotelIds.length) {
    return { ok: false, status: 403, message: '无权操作该酒店' }
  }

  const { data: roomTypes, error } = await supabase
    .from('room_types')
    .select('*')
    .in('hotel_id', filteredHotelIds)
    .eq('name', roomTypeName)

  if (error) {
    return { ok: false, status: 500, message: '批量房型操作失败：' + error.message }
  }

  const results = await Promise.all(
    (roomTypes || []).map(async (room) => {
      const currentStock = normalizeNumber(room.stock)
      const used = normalizeNumber(room.used_stock)
      const offline = normalizeNumber(room.offline_stock)

      if (action === 'offline') {
        const offlineQty = Math.max(normalizeNumber(quantity), 0)
        const maxAvailable = Math.max(currentStock - used - offline, 0)
        const applyQty = Math.min(offlineQty, maxAvailable)
        const nextOffline = offline + applyQty

        const { data: updated, error: updateError } = await supabase
          .from('room_types')
          .update({ offline_stock: nextOffline })
          .eq('id', room.id)
          .select()
          .single()

        if (updateError) {
          return { ok: false, message: updateError.message }
        }
        return { ok: true, data: updated }
      }

      const nextStock = normalizeNumber(stock)
      if (nextStock < used) {
        return { ok: false, message: '库存不能小于已使用数量' }
      }
      const nextOffline = Math.min(offline, Math.max(nextStock - used, 0))

      const { data: updated, error: updateError } = await supabase
        .from('room_types')
        .update({ stock: nextStock, offline_stock: nextOffline })
        .eq('id', room.id)
        .select()
        .single()

      if (updateError) {
        return { ok: false, message: updateError.message }
      }
      return { ok: true, data: updated }
    })
  )

  const successCount = results.filter((item) => item.ok).length
  const failed = results.find((item) => !item.ok)
  if (failed) {
    return { ok: false, status: 400, message: failed.message }
  }

  return { ok: true, status: 200, data: { successCount, total: roomTypes?.length || 0 } }
}

const getHotelRoomOverview = async ({ hotelId }) => {
  const { data: roomTypes, error } = await supabase
    .from('room_types')
    .select('*')
    .eq('hotel_id', hotelId)

  if (error) {
    return { ok: false, status: 500, message: '获取房间总览失败：' + error.message }
  }

  const totals = (roomTypes || []).reduce(
    (acc, room) => {
      const stock = normalizeNumber(room.stock)
      const used = normalizeNumber(room.used_stock)
      const offline = normalizeNumber(room.offline_stock)
      const available = Math.max(stock - used - offline, 0)
      acc.total += stock
      acc.used += used
      acc.offline += offline
      acc.available += available
      return acc
    },
    { total: 0, used: 0, available: 0, offline: 0 }
  )

  return { ok: true, status: 200, data: totals }
}

const listHotelOrders = async ({ merchantId, hotelId, page = 1, pageSize = 10 }) => {
  const normalizedPage = Math.max(Number(page) || 1, 1)
  const normalizedPageSize = Math.max(Number(pageSize) || 10, 1)
  const offset = (normalizedPage - 1) * normalizedPageSize

  let query = supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .eq('hotel_id', hotelId)
    .order('created_at', { ascending: false })
    .range(offset, offset + normalizedPageSize - 1)

  if (merchantId) {
    query = query.eq('merchant_id', merchantId)
  }

  const { data, error, count } = await query

  if (error) {
    if (error.message && error.message.includes('relation') && error.message.includes('orders')) {
      return { ok: true, status: 200, data: { list: [], total: 0, page: normalizedPage, pageSize: normalizedPageSize } }
    }
    return { ok: false, status: 500, message: '获取订单失败：' + error.message }
  }

  return {
    ok: true,
    status: 200,
    data: {
      list: data || [],
      total: count || 0,
      page: normalizedPage,
      pageSize: normalizedPageSize
    }
  }
}

const getHotelOrderStats = async ({ merchantId, hotelId }) => {
  let query = supabase
    .from('orders')
    .select('total_price, status, created_at, room_type_name, quantity, nights, check_in')
    .eq('hotel_id', hotelId)

  if (merchantId) {
    query = query.eq('merchant_id', merchantId)
  }

  const { data, error } = await query

  if (error) {
    if (error.message && error.message.includes('relation') && error.message.includes('orders')) {
      return { ok: true, status: 200, data: { totalOrders: 0, revenue: 0, statusStats: [], monthly: [], roomTypeDaily: [], roomTypeMonthly: [], roomTypeSummary: [] } }
    }
    return { ok: false, status: 500, message: '获取订单统计失败：' + error.message }
  }

  const { data: roomTypes } = await supabase
    .from('room_types')
    .select('name, stock')
    .eq('hotel_id', hotelId)

  const roomStockMap = {}
  ;(roomTypes || []).forEach((room) => {
    if (!roomStockMap[room.name]) {
      roomStockMap[room.name] = normalizeNumber(room.stock)
    }
  })

  const statusMap = {}
  const monthlyMap = {}
  const dailyMap = {}
  const monthlyRoomMap = {}
  const summaryMap = {}
  let revenue = 0

  const addDaily = (roomTypeName, dateKey, nights, total) => {
    const key = `${roomTypeName}__${dateKey}`
    if (!dailyMap[key]) {
      dailyMap[key] = { roomTypeName, date: dateKey, nights: 0, revenue: 0 }
    }
    dailyMap[key].nights += nights
    dailyMap[key].revenue += total
  }

  const addMonthly = (roomTypeName, monthKey, nights, total) => {
    const key = `${roomTypeName}__${monthKey}`
    if (!monthlyRoomMap[key]) {
      monthlyRoomMap[key] = { roomTypeName, month: monthKey, nights: 0, revenue: 0 }
    }
    monthlyRoomMap[key].nights += nights
    monthlyRoomMap[key].revenue += total
  }

  ;(data || []).forEach((order) => {
    const status = order.status || 'unknown'
    const total = normalizeNumber(order.total_price)
    const monthKey = order.created_at ? new Date(order.created_at).toISOString().slice(0, 7) : 'unknown'
    const roomTypeName = order.room_type_name || '未知房型'
    const quantity = Math.max(normalizeNumber(order.quantity), 0)
    const nights = Math.max(normalizeNumber(order.nights), 1)
    const startDate = order.check_in ? new Date(order.check_in) : new Date(order.created_at)

    statusMap[status] = (statusMap[status] || 0) + 1
    monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + total
    revenue += total

    if (!summaryMap[roomTypeName]) {
      summaryMap[roomTypeName] = { roomTypeName, nights: 0, revenue: 0, days: new Set() }
    }

    for (let i = 0; i < nights; i += 1) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const dateKey = date.toISOString().slice(0, 10)
      const dayTotal = total / nights
      addDaily(roomTypeName, dateKey, quantity, dayTotal)
      addMonthly(roomTypeName, dateKey.slice(0, 7), quantity, dayTotal)
      summaryMap[roomTypeName].nights += quantity
      summaryMap[roomTypeName].revenue += dayTotal
      summaryMap[roomTypeName].days.add(dateKey)
    }
  })

  const statusStats = Object.keys(statusMap).map((key) => ({ status: key, count: statusMap[key] }))
  const monthly = Object.keys(monthlyMap)
    .sort()
    .map((key) => ({ month: key, revenue: monthlyMap[key] }))

  const roomTypeDaily = Object.values(dailyMap)
    .map((item) => {
      const stock = roomStockMap[item.roomTypeName] || 0
      const occupancyRate = stock ? Math.round((item.nights / stock) * 100) : 0
      return { ...item, occupancyRate }
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.roomTypeName.localeCompare(b.roomTypeName))

  const roomTypeMonthly = Object.values(monthlyRoomMap)
    .map((item) => {
      const stock = roomStockMap[item.roomTypeName] || 0
      const [year, month] = item.month.split('-').map((v) => Number(v))
      const daysInMonth = year && month ? new Date(year, month, 0).getDate() : 0
      const occupancyRate = stock && daysInMonth ? Math.round((item.nights / (stock * daysInMonth)) * 100) : 0
      return { ...item, occupancyRate }
    })
    .sort((a, b) => a.month.localeCompare(b.month) || a.roomTypeName.localeCompare(b.roomTypeName))

  const roomTypeSummary = Object.values(summaryMap).map((item) => {
    const stock = roomStockMap[item.roomTypeName] || 0
    const daysCount = item.days.size || 1
    const occupancyRate = stock ? Math.round((item.nights / (stock * daysCount)) * 100) : 0
    return {
      roomTypeName: item.roomTypeName,
      nights: item.nights,
      revenue: Math.round(item.revenue * 100) / 100,
      occupancyRate
    }
  }).sort((a, b) => b.revenue - a.revenue)

  return { ok: true, status: 200, data: { totalOrders: data?.length || 0, revenue, statusStats, monthly, roomTypeDaily, roomTypeMonthly, roomTypeSummary } }
}

const getMerchantOverview = async ({ merchantId }) => {
  const { data: hotels, error } = await supabase
    .from('hotels')
    .select('id, name, status')
    .eq('merchant_id', merchantId)

  if (error) {
    return { ok: false, status: 500, message: '获取酒店统计失败：' + error.message }
  }

  const hotelIds = (hotels || []).map((hotel) => hotel.id)
  const { data: roomTypes } = hotelIds.length
    ? await supabase.from('room_types').select('hotel_id, name, stock, used_stock, offline_stock')
      .in('hotel_id', hotelIds)
    : { data: [] }

  const totals = { totalRooms: 0, usedRooms: 0, availableRooms: 0, offlineRooms: 0, roomTypeCount: 0 }
  const hotelStatsMap = {}

  ;(hotels || []).forEach((hotel) => {
    hotelStatsMap[hotel.id] = { hotelId: hotel.id, name: hotel.name, status: hotel.status, totalRooms: 0, usedRooms: 0, availableRooms: 0, offlineRooms: 0, roomTypeCount: 0 }
  })

  ;(roomTypes || []).forEach((room) => {
    const stock = normalizeNumber(room.stock)
    const used = normalizeNumber(room.used_stock)
    const offline = normalizeNumber(room.offline_stock)
    const available = Math.max(stock - used - offline, 0)
    totals.totalRooms += stock
    totals.usedRooms += used
    totals.offlineRooms += offline
    totals.availableRooms += available
    totals.roomTypeCount += 1

    if (hotelStatsMap[room.hotel_id]) {
      hotelStatsMap[room.hotel_id].totalRooms += stock
      hotelStatsMap[room.hotel_id].usedRooms += used
      hotelStatsMap[room.hotel_id].offlineRooms += offline
      hotelStatsMap[room.hotel_id].availableRooms += available
      hotelStatsMap[room.hotel_id].roomTypeCount += 1
    }
  })

  const hotelStats = Object.values(hotelStatsMap).map((item) => {
    const occupancyRate = item.totalRooms ? Math.round((item.usedRooms / item.totalRooms) * 100) : 0
    const availableRate = item.totalRooms ? Math.round((item.availableRooms / item.totalRooms) * 100) : 0
    const offlineRate = item.totalRooms ? Math.round((item.offlineRooms / item.totalRooms) * 100) : 0
    return { ...item, occupancyRate, availableRate, offlineRate }
  })

  const occupancyRate = totals.totalRooms ? Math.round((totals.usedRooms / totals.totalRooms) * 100) : 0
  const availableRate = totals.totalRooms ? Math.round((totals.availableRooms / totals.totalRooms) * 100) : 0
  const offlineRate = totals.totalRooms ? Math.round((totals.offlineRooms / totals.totalRooms) * 100) : 0

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

  const { data: orders, error: orderError } = await supabase
    .from('orders')
    .select('total_price, created_at')
    .eq('merchant_id', merchantId)
    .gte('created_at', startOfMonth)
    .lt('created_at', endOfMonth)

  if (orderError && (!orderError.message || !orderError.message.includes('orders'))) {
    return { ok: false, status: 500, message: '获取收入统计失败：' + orderError.message }
  }

  const monthlyRevenue = (orders || []).reduce((sum, order) => sum + normalizeNumber(order.total_price), 0)

  return {
    ok: true,
    status: 200,
    data: {
      totalHotels: hotelIds.length,
      monthlyRevenue,
      ...totals,
      occupancyRate,
      availableRate,
      offlineRate,
      hotelStats
    }
  }
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
  const roomTypeMap = {}

  if (hotelIds.length) {
    const { data: roomTypes } = await supabase
      .from('room_types')
      .select('hotel_id, name, price, stock, used_stock, offline_stock, discount_rate, discount_quota')
      .in('hotel_id', hotelIds)

    ;(roomTypes || []).forEach((room) => {
      if (!roomTypeMap[room.hotel_id]) {
        roomTypeMap[room.hotel_id] = []
      }
      roomTypeMap[room.hotel_id].push(room)
    })
  }

  const enriched = hotels.map((hotel) => ({
    ...hotel,
    lowestPrice: priceMap[hotel.id],
    roomTypes: roomTypeMap[hotel.id] || []
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
    if (rejectReason) {
      updates.reject_reason = rejectReason  // 存储下线原因
    }
  } else if (status === 'restore') {
    updates.status = 'approved'
    updates.reject_reason = ''
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

  // 使用通知服务发送通知给商家
  let notification
  if (status === 'approved') {
    notification = NotificationTemplates.hotelApproved(hotel.name, hotelId)
  } else if (status === 'rejected') {
    notification = NotificationTemplates.hotelRejected(hotel.name, hotelId, rejectReason)
  } else if (status === 'offline') {
    notification = NotificationTemplates.hotelOffline(hotel.name, hotelId, rejectReason)
  } else {
    notification = NotificationTemplates.hotelRestored(hotel.name, hotelId)
  }

  await sendNotification({
    userId: hotel.merchant_id,
    ...notification
  })

  return { ok: true, status: 200, data: updatedHotel }
}

// 公开酒店列表
const listPublicHotels = async ({ query }) => {
  const {
    city,
    keyword,
    sort,
    checkIn,
    checkOut,
    stars, // comma separated strings '3,4,5'
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
    dbQuery = dbQuery.ilike('city', `%${city}%`)
  }

  if (keyword) {
    dbQuery = dbQuery.or(`name.ilike.%${keyword}%,name_en.ilike.%${keyword}%,address.ilike.%${keyword}%`)
  }

  if (stars) {
    const starList = stars.split(',').map(Number).filter(n => !isNaN(n))
    if (starList.length > 0) {
      dbQuery = dbQuery.in('star_rating', starList)
    }
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

  if (sort === 'price_asc') {
    enriched.sort((a, b) => (a.lowestPrice || 0) - (b.lowestPrice || 0))
  } else if (sort === 'price_desc') {
    enriched.sort((a, b) => (b.lowestPrice || 0) - (a.lowestPrice || 0))
  } else if (sort === 'star' || sort === 'score_desc') {
    enriched.sort((a, b) => (b.star_rating || 0) - (a.star_rating || 0))
  } else if (sort === 'recommend') {
    enriched.sort((a, b) => (b.star_rating || 0) - (a.star_rating || 0) || (a.lowestPrice || 0) - (b.lowestPrice || 0))
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

const createPublicOrder = async ({ hotelId, payload }) => {
  const {
    roomTypeId,
    roomTypeName,
    quantity = 1,
    checkIn,
    checkOut
  } = payload || {}

  if (!hotelId) {
    return { ok: false, status: 400, message: 'hotelId 不能为空' }
  }
  if (!roomTypeId && !roomTypeName) {
    return { ok: false, status: 400, message: 'roomTypeId 或 roomTypeName 不能为空' }
  }

  const { data: hotel, error: hotelError } = await supabase
    .from('hotels')
    .select('id, merchant_id, status')
    .eq('id', hotelId)
    .eq('status', 'approved')
    .single()

  if (hotelError || !hotel) {
    return { ok: false, status: 404, message: '酒店不存在或未上架' }
  }

  let roomQuery = supabase
    .from('room_types')
    .select('*')
    .eq('hotel_id', hotelId)

  if (roomTypeId) {
    roomQuery = roomQuery.eq('id', roomTypeId)
  } else {
    roomQuery = roomQuery.eq('name', roomTypeName)
  }

  const { data: room, error: roomError } = await roomQuery.single()

  if (roomError || !room) {
    return { ok: false, status: 404, message: '房型不存在' }
  }

  const normalizedQuantity = Math.max(normalizeNumber(quantity), 1)
  const stock = normalizeNumber(room.stock)
  const used = normalizeNumber(room.used_stock)
  const offline = normalizeNumber(room.offline_stock)
  const available = Math.max(stock - used - offline, 0)

  if (available < normalizedQuantity) {
    return { ok: false, status: 400, message: '房型库存不足' }
  }

  let nights = 1
  let checkInValue = null
  let checkOutValue = null

  if (checkIn || checkOut) {
    const checkInDate = checkIn ? new Date(checkIn) : null
    const checkOutDate = checkOut ? new Date(checkOut) : null
    if (!checkInDate || Number.isNaN(checkInDate.getTime()) || !checkOutDate || Number.isNaN(checkOutDate.getTime())) {
      return { ok: false, status: 400, message: '入住或离店日期不合法' }
    }
    const diff = (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)
    if (diff <= 0) {
      return { ok: false, status: 400, message: '离店日期需晚于入住日期' }
    }
    nights = Math.max(1, Math.round(diff))
    checkInValue = checkIn
    checkOutValue = checkOut
  }

  const pricePerNight = normalizeNumber(room.price)
  const totalPrice = Math.round(pricePerNight * normalizedQuantity * nights * 100) / 100

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      hotel_id: hotelId,
      merchant_id: hotel.merchant_id,
      room_type_id: room.id,
      room_type_name: room.name,
      quantity: normalizedQuantity,
      price_per_night: pricePerNight,
      nights,
      total_price: totalPrice,
      status: 'confirmed',
      check_in: checkInValue,
      check_out: checkOutValue
    })
    .select()
    .single()

  if (orderError) {
    return { ok: false, status: 500, message: '创建订单失败：' + orderError.message }
  }

  const { error: updateError } = await supabase
    .from('room_types')
    .update({ used_stock: used + normalizedQuantity })
    .eq('id', room.id)

  if (updateError) {
    await supabase.from('orders').delete().eq('id', order.id)
    return { ok: false, status: 500, message: '更新库存失败：' + updateError.message }
  }

  return { ok: true, status: 201, data: order }
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
  getPublicHotel,
  createPublicOrder,
  getRoomTypeStatsByHotelIds,
  batchSetRoomDiscount,
  batchRoomOperation,
  getHotelRoomOverview,
  listHotelOrders,
  getHotelOrderStats,
  getMerchantOverview
}
