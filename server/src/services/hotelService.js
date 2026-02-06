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
    .select('hotel_id, price, discount_rate')
    .in('hotel_id', hotelIds)

  const priceMap = {}
  hotelIds.forEach((id) => {
    priceMap[id] = null
  })

  if (roomTypes) {
    roomTypes.forEach((room) => {
      let finalPrice = Number(room.price) || 0
      const discount = Number(room.discount_rate) || 0

      if (discount > 0 && discount <= 10) {
        finalPrice = finalPrice * (discount / 10)
      } else if (discount < 0) {
        finalPrice = Math.max(0, finalPrice + discount)
      }

      // 保留两位小数
      finalPrice = Math.round(finalPrice * 100) / 100

      if (priceMap[room.hotel_id] === null || finalPrice < priceMap[room.hotel_id]) {
        priceMap[room.hotel_id] = finalPrice
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

  if (normalizedDiscount > 10) {
    return { ok: false, status: 400, message: '折扣力度不能大于10' }
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
      // 检查减免金额是否超过原价
      if (normalizedDiscount < 0 && Math.abs(normalizedDiscount) > normalizeNumber(room.price)) {
        return { ok: false, message: '减免金额不能大于房型原价' }
      }

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
  
  console.log(`[BatchSetDiscount] Success Count: ${successCount}, Filtered Hotel IDs: ${filteredHotelIds.join(',')}`)

  // 重新计算受影响酒店的最优折扣（确保条件优惠能生效）
  if (successCount > 0) {
    const { data: hotelsWithPromotions } = await supabase
      .from('hotels')
      .select('id, promotions')
      .in('id', filteredHotelIds)

    if (hotelsWithPromotions && hotelsWithPromotions.length > 0) {
      await Promise.all(
        hotelsWithPromotions.map(hotel => 
          applyPromotionsToRooms(hotel.id, hotel.promotions)
        )
      )
    }
  }

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

  // 计算最佳折扣
  let bestDiscount = 0
  const promoList = normalizeArray(promotions)
  if (promoList.length > 0) {
    const fixedDiscounts = promoList.filter(p => Number(p.value) < 0)
    const rateDiscounts = promoList.filter(p => Number(p.value) > 0 && Number(p.value) <= 10)

    if (fixedDiscounts.length > 0) {
      bestDiscount = Math.min(...fixedDiscounts.map(p => Number(p.value)))
    } else if (rateDiscounts.length > 0) {
      bestDiscount = Math.min(...rateDiscounts.map(p => Number(p.value)))
    }
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
        stock: Number(room.stock) || 0,
        discount_rate: bestDiscount, // 自动应用酒店优惠
        discount_quota: bestDiscount !== 0 ? 999 : 0 // 有折扣时默认给配额
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
        stock: Number(room.stock) || 0,
        discount_rate: Number(room.discount_rate) || 0,
        discount_quota: Number(room.discount_quota) || 0
      }))

    if (roomTypesToInsert.length > 0) {
      await supabase.from('room_types').insert(roomTypesToInsert)
    }
  }

  // 如果更新了 promotions，执行智能价格计算
  if (promotions !== undefined) {
    await applyPromotionsToRooms(hotelId, promotions)
  }

  // 获取当前房型
  const { data: currentRoomTypes } = await supabase
    .from('room_types')
    .select('*')
    .eq('hotel_id', hotelId)

  return { ok: true, status: 200, data: { ...updatedHotel, roomTypes: currentRoomTypes || [] } }
}

// 应用优惠到房型
const applyPromotionsToRooms = async (hotelId, promotions) => {
  const promoList = normalizeArray(promotions)
    
  // 获取当前酒店的所有房型
  const { data: allRoomTypes } = await supabase
    .from('room_types')
    .select('*')
    .eq('hotel_id', hotelId)

  if (allRoomTypes && allRoomTypes.length > 0) {
    const updatesPromise = allRoomTypes.map(async (room) => {
      const price = Number(room.price) || 0
      if (price <= 0) return // 价格异常不处理

      let bestDiscount = 0
      let minFinalPrice = price // 默认原价

      // 1. 没有任何优惠的情况
      if (promoList.length === 0) {
        bestDiscount = 0
      } else {
        // 2. 遍历所有优惠计算折后价
        promoList.forEach(p => {
          const val = Number(p.value)
          let currentFinalPrice = price
          let currentDiscount = 0

          if (val > 0 && val <= 10) {
            // 折扣率 (e.g. 8折)
            currentFinalPrice = price * (val / 10)
            currentDiscount = val
          } else if (val < 0) {
            // 固定减免 (e.g. -200)
            currentFinalPrice = price + val // val is negative
            currentDiscount = val
          }

          // 价格不能低于0
          if (currentFinalPrice < 0) currentFinalPrice = 0

          // 找到更低价格，更新最佳策略
          // 如果价格相同，优先选固定减免（通常用户感知更强）
          if (currentFinalPrice < minFinalPrice) {
            minFinalPrice = currentFinalPrice
            bestDiscount = currentDiscount
          } else if (currentFinalPrice === minFinalPrice && bestDiscount > 0 && currentDiscount < 0) {
            // 同价时优先选减免
            bestDiscount = currentDiscount
          }
        })
      }

      // 获取当前房型已有的折扣价格（用户手动设置的或上次保存的）
      const currentDiscount = Number(room.discount_rate) || 0
      let currentPriceWithExistingDiscount = price
      if (currentDiscount > 0 && currentDiscount <= 10) {
          currentPriceWithExistingDiscount = price * (currentDiscount / 10)
      } else if (currentDiscount < 0) {
          currentPriceWithExistingDiscount = price + currentDiscount
      }
      if (currentPriceWithExistingDiscount < 0) currentPriceWithExistingDiscount = 0

      // 策略优化：
      // 1. 如果 Promotions 能提供比当前更低的价格，则应用 Promotions 的优惠。
      // 2. 如果当前价格已经比 Promotions 提供的更低（说明用户手动设置了更大力度的折扣），则保留当前的，不更新。
      // 3. 如果 Promotions 没有优惠 (bestDiscount === 0)，也不要强制覆盖为 0，以免清除用户手动设置的折扣。
      
      let shouldUpdate = false
      if (minFinalPrice < currentPriceWithExistingDiscount) {
          // Promotions 提供了更低价，应用它
          shouldUpdate = true
      } else {
          shouldUpdate = false
      }

      // 仅当需要更新且折扣值确实不同时才执行数据库操作
      if (shouldUpdate && room.discount_rate !== bestDiscount) {
        // 如果当前房型有手动设置的配额(来自刚刚的Insert)，则保留它
        // 如果没有(为0)，且我们要设置新的折扣(bestDiscount!=0)，则默认给999
        const newQuota = room.discount_quota > 0 ? room.discount_quota : (bestDiscount !== 0 ? 999 : 0)

        await supabase
          .from('room_types')
          .update({ 
            discount_rate: bestDiscount,
            discount_quota: newQuota 
          })
          .eq('id', room.id)
      }
    })

    await Promise.all(updatesPromise)
  }
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

  // 计算批量折扣
  const discountRate = Number(room.discount_rate) || 0
  const discountQuota = Number(room.discount_quota) || 0
  
  // 折扣逻辑: 0 < rate <= 10 为折扣率(x折); rate < 0 为固定减免金额
  const isPercentage = discountRate > 0 && discountRate <= 10
  const isFixed = discountRate < 0
  const hasDiscount = (isPercentage || isFixed) && discountQuota > 0

  let totalPrice = 0
  let discountCount = 0

  if (hasDiscount) {
    // 只有配额内的数量享受折扣
    discountCount = Math.min(normalizedQuantity, discountQuota)
    const normalCount = normalizedQuantity - discountCount
    
    let discountedPricePerNight = pricePerNight
    if (isPercentage) {
      discountedPricePerNight = Math.round(pricePerNight * discountRate * 10) / 100
    } else if (isFixed) {
      discountedPricePerNight = Math.max(0, pricePerNight + discountRate) // discountRate 为负数
    }
    
    totalPrice = (discountedPricePerNight * discountCount + pricePerNight * normalCount) * nights
  } else {
    totalPrice = pricePerNight * normalizedQuantity * nights
  }
  
  totalPrice = Math.round(totalPrice * 100) / 100

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

  // 如果使用了折扣配额，更新配额
  if (discountCount > 0) {
    const newQuota = Math.max(0, discountQuota - discountCount)
    await supabase
      .from('room_types')
      .update({ discount_quota: newQuota })
      .eq('id', room.id)
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
  getMerchantOverview,
  applyPromotionsToRooms
}
