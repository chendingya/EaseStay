const supabase = require('../config/supabase')
const { sendNotification, NotificationTemplates } = require('./notificationService')
const mapService = require('./mapService')
const { cityData } = require('../utils/cityData')

// --- City Lookup Initialization ---
const cityLookup = new Map()
const addToLookup = (fullName) => {
  if (!fullName) return
  // 1. Full match
  cityLookup.set(fullName, fullName)
  
  // 2. Short match (remove common suffixes)
  // 优先匹配最长的前缀，比如 "新疆维吾尔自治区" -> "新疆"
  const shortNames = []
  if (fullName.endsWith('市')) shortNames.push(fullName.slice(0, -1))
  if (fullName.endsWith('省')) shortNames.push(fullName.slice(0, -1))
  if (fullName.endsWith('特别行政区')) shortNames.push(fullName.slice(0, -6))
  if (fullName.endsWith('自治区')) shortNames.push(fullName.slice(0, -3))
  if (fullName.endsWith('维吾尔自治区')) shortNames.push(fullName.slice(0, -7))
  if (fullName.endsWith('壮族自治区')) shortNames.push(fullName.slice(0, -6))
  if (fullName.endsWith('回族自治区')) shortNames.push(fullName.slice(0, -6))
  
  shortNames.forEach(short => {
    if (short && !cityLookup.has(short)) {
        cityLookup.set(short, fullName)
    }
  })
}

// Initialize lookup map
if (Array.isArray(cityData)) {
    cityData.forEach(prov => {
        addToLookup(prov.label)
        if (prov.children) {
            prov.children.forEach(city => {
                addToLookup(city.label)
            })
        }
    })
}

/**
 * 城市名称标准化：将简称转为标准全称
 * 例如：上海 -> 上海市，北京 -> 北京市
 */
const normalizeCityName = (input) => {
  if (!input || typeof input !== 'string') return input
  const trimmed = input.trim()
  
  // 1. 精确匹配（已存在标准名称）
  if (cityLookup.has(trimmed)) {
    return cityLookup.get(trimmed)
  }
  
  // 2. 尝试去除后缀后再匹配
  const noSuffix = trimmed.replace(/(市|省|自治区|特别行政区)$/, '')
  if (cityLookup.has(noSuffix)) {
    return cityLookup.get(noSuffix)
  }
  
  // 3. 未找到匹配，保持原样（但统一加"市"后缀作为默认格式）
  if (!trimmed.endsWith('市') && !trimmed.endsWith('省') && !trimmed.endsWith('自治区') && !trimmed.endsWith('特别行政区')) {
    return trimmed + '市'
  }
  
  return trimmed
}

const {
  formatDateOnly,
  getActiveOrderQtyMap,
  computeRoomAvailability,
  roundToTwo
} = require('./roomAvailabilityService')
const { calculateRoomPrice } = require('./pricingService')

const normalizeArray = (value) => (Array.isArray(value) ? value : [])
const normalizeNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0)
const parseCoordinate = (value, { min, max, label }) => {
  if (value === undefined) return { provided: false }
  if (value === null || String(value).trim() === '') return { provided: true, value: null }
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < min || numeric > max) {
    return { provided: true, invalid: true, message: `${label}取值范围应在 ${min} 到 ${max}` }
  }
  return { provided: true, value: numeric }
}
const generateOrderNo = () => `YS${Date.now()}${Math.floor(Math.random() * 900000 + 100000)}`
const normalizeText = (value) => String(value || '').trim().toLowerCase()
const parseCsvList = (value) => String(value || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)
const normalizeFacilities = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    const raw = value.trim()
    if (!raw) return []
    if ((raw.startsWith('[') && raw.endsWith(']')) || (raw.startsWith('{') && raw.endsWith('}'))) {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item || '').trim()).filter(Boolean)
        }
      } catch (error) {}
    }
    return parseCsvList(raw)
  }
  return []
}
const getMatchedTagCount = (facilities, tags = []) => {
  const normalizedTags = normalizeArray(tags).map(normalizeText).filter(Boolean)
  if (!normalizedTags.length) return 0
  const normalizedFacilities = normalizeFacilities(facilities).map(normalizeText).filter(Boolean)
  if (!normalizedFacilities.length) return 0
  return normalizedTags.reduce((count, tag) => {
    const matched = normalizedFacilities.some((facility) => (
      facility === tag || facility.includes(tag) || tag.includes(facility)
    ))
    return matched ? count + 1 : count
  }, 0)
}

const applyTagAwareSort = (items, { sort, tagList }) => {
  const hasTagSort = Array.isArray(tagList) && tagList.length > 0
  items.sort((a, b) => {
    if (hasTagSort) {
      const tagDiff = (b._tagMatchCount || 0) - (a._tagMatchCount || 0)
      if (tagDiff !== 0) return tagDiff
    }
    if (sort === 'price_asc') {
      return (a.lowestPrice || 0) - (b.lowestPrice || 0)
    }
    if (sort === 'price_desc') {
      return (b.lowestPrice || 0) - (a.lowestPrice || 0)
    }
    if (sort === 'star' || sort === 'score_desc') {
      return (b.star_rating || 0) - (a.star_rating || 0)
    }
    return (b.star_rating || 0) - (a.star_rating || 0) || (a.lowestPrice || 0) - (b.lowestPrice || 0)
  })
}

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
const getLowestPrices = async (hotelIds, pricingOptions = {}) => {
  if (!hotelIds.length) return {}
  const { checkIn, checkOut } = pricingOptions

  const { data: roomTypes } = await supabase
    .from('room_types')
    .select('id, hotel_id, price, discount_rate, discount_quota, discount_periods, stock, is_active')
    .in('hotel_id', hotelIds)

  const { data: hotels } = await supabase
    .from('hotels')
    .select('id, promotions')
    .in('id', hotelIds)

  const hotelPromoMap = {}
  ;(hotels || []).forEach((h) => {
    hotelPromoMap[h.id] = normalizeArray(h.promotions)
  })

  const priceMap = {}
  hotelIds.forEach((id) => {
    priceMap[id] = null
  })

  let usedMap = new Map()
  if (roomTypes && roomTypes.length) {
    const roomTypeIds = roomTypes.map((room) => room.id).filter((id) => Number.isFinite(Number(id)))
    const usedResult = await getActiveOrderQtyMap(
      checkIn && checkOut
        ? { roomTypeIds, checkIn, checkOut }
        : { roomTypeIds, asOfDate: new Date() }
    )
    if (usedResult.ok) {
      usedMap = usedResult.map
    }
  }

  if (roomTypes) {
    roomTypes.forEach((room) => {
      const active = room.is_active !== false
      const stock = normalizeNumber(room.stock)
      const used = usedMap.get(room.id) || 0
      const available = computeRoomAvailability({ stock, used, isActive: active }).available
      if (available <= 0) return
      const promos = hotelPromoMap[room.hotel_id] || []
      const { finalPrice } = calculateRoomPrice({
        room,
        promotions: promos,
        checkIn,
        checkOut,
        asOfDate: new Date()
      })

      if (priceMap[room.hotel_id] === null || finalPrice < priceMap[room.hotel_id]) {
        priceMap[room.hotel_id] = finalPrice
      }
    })
  }

  return priceMap
}

const enrichRoomTypesWithPricing = ({
  roomTypes = [],
  promotions = [],
  pricingContext = {},
  usedStockMap = new Map(),
  orderRoomSet = null
} = {}) => {
  return normalizeArray(roomTypes).map((room) => {
    const pricing = calculateRoomPrice({
      room,
      promotions: normalizeArray(promotions),
      ...pricingContext
    })
    const enriched = {
      ...room,
      used_stock: usedStockMap.get(room.id) || 0,
      display_price: pricing.finalPrice,
      base_price: pricing.basePrice,
      promotion_price: pricing.promotionAdjustedPrice,
      has_room_discount: pricing.hasRoomDiscount,
      room_discount_label: pricing.roomDiscountLabel,
      effective_promotions: pricing.effectivePromotions
    }
    if (orderRoomSet instanceof Set) {
      enriched.has_orders = orderRoomSet.has(room.id)
    }
    return enriched
  }).sort((a, b) => normalizeNumber(a.display_price) - normalizeNumber(b.display_price))
}

const getRoomTypeCountMap = async (hotelIds) => {
  if (!hotelIds.length) return {}

  const { data: roomTypes, error } = await supabase
    .from('room_types')
    .select('hotel_id')
    .in('hotel_id', hotelIds)

  if (error) {
    return {}
  }

  const countMap = {}
  hotelIds.forEach((id) => {
    countMap[id] = 0
  })

  ;(roomTypes || []).forEach((item) => {
    const hotelId = item?.hotel_id
    if (hotelId === undefined || hotelId === null) return
    countMap[hotelId] = (countMap[hotelId] || 0) + 1
  })

  return countMap
}

const buildIdInFilter = (ids = []) => {
  const normalized = ids
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id))
  if (!normalized.length) return ''
  return `(${normalized.join(',')})`
}

const getPendingDeleteHotelIds = async () => {
  const { data, error } = await supabase
    .from('requests')
    .select('hotel_id')
    .eq('type', 'hotel_delete')
    .eq('status', 'pending')

  if (error) {
    return { ok: false, status: 500, message: '查询删除申请失败：' + error.message }
  }

  const ids = [...new Set((data || []).map((item) => item.hotel_id).filter((id) => Number.isFinite(Number(id))))]
  return { ok: true, status: 200, data: ids }
}

const applyAdminHotelFilters = ({ query, status, keyword, city, excludeIds }) => {
  const inFilter = buildIdInFilter(excludeIds)

  if (inFilter) {
    query = query.not('id', 'in', inFilter)
  }

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  if (city && city !== 'all') {
    query = query.eq('city', city)
  }

  const normalizedKeyword = String(keyword || '').trim()
  if (normalizedKeyword) {
    const safeKeyword = normalizedKeyword.replace(/[(),]/g, ' ').replace(/\s+/g, ' ').trim()
    if (safeKeyword) {
      query = query.or(`name.ilike.%${safeKeyword}%,name_en.ilike.%${safeKeyword}%,address.ilike.%${safeKeyword}%`)
    }
  }

  return query
}

const getAdminHotelStats = async ({ excludeIds = [] }) => {
  const buildCountQuery = (status) => {
    let query = supabase
      .from('hotels')
      .select('id', { count: 'exact', head: true })

    const inFilter = buildIdInFilter(excludeIds)
    if (inFilter) {
      query = query.not('id', 'in', inFilter)
    }

    if (status) {
      query = query.eq('status', status)
    }

    return query
  }

  const [totalRes, approvedRes, pendingRes, offlineRes] = await Promise.all([
    buildCountQuery(''),
    buildCountQuery('approved'),
    buildCountQuery('pending'),
    buildCountQuery('offline')
  ])

  const firstError = totalRes.error || approvedRes.error || pendingRes.error || offlineRes.error
  if (firstError) {
    return { ok: false, status: 500, message: '查询统计失败：' + firstError.message }
  }

  return {
    ok: true,
    status: 200,
    data: {
      total: totalRes.count || 0,
      approved: approvedRes.count || 0,
      pending: pendingRes.count || 0,
      offline: offlineRes.count || 0
    }
  }
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

  const roomTypeIds = (roomTypes || []).map((room) => room.id).filter((id) => Number.isFinite(Number(id)))
  const usedResult = await getActiveOrderQtyMap({ roomTypeIds, asOfDate: new Date() })
  if (!usedResult.ok) {
    return { ok: false, status: 500, message: usedResult.message }
  }

  const statsMap = {}

  ;(roomTypes || []).forEach((room) => {
    const name = room.name || '未知房型'
    const stock = normalizeNumber(room.stock)
    const used = usedResult.map.get(room.id) || 0
    const active = room.is_active !== false
    const { available, offline } = computeRoomAvailability({ stock, used, isActive: active })

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

const batchSetRoomDiscount = async ({ hotelIds, roomTypeName, quantity, discount, periods, merchantId }) => {
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
  const normalizedPeriods = normalizeArray(periods).filter((p) => p && p.start && p.end)

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

  const roomTypeIds = (roomTypes || []).map((room) => room.id).filter((id) => Number.isFinite(Number(id)))
  const usedResult = await getActiveOrderQtyMap({ roomTypeIds, asOfDate: new Date() })
  if (!usedResult.ok) {
    return { ok: false, status: 500, message: usedResult.message }
  }

  const isCancel = normalizedDiscount === 0
  const updates = await Promise.all(
    (roomTypes || []).map(async (room) => {
      if (normalizedDiscount < 0 && Math.abs(normalizedDiscount) > normalizeNumber(room.price)) {
        return { ok: false, message: '减免金额不能大于房型原价' }
      }

      const stock = normalizeNumber(room.stock)
      const used = usedResult.map.get(room.id) || 0
      const active = room.is_active !== false
      const available = computeRoomAvailability({ stock, used, isActive: active }).available
      const quota = isCancel ? 0 : (normalizedQuantity > 0 ? Math.min(normalizedQuantity, available) : 0)

      const { data: updated, error: updateError } = await supabase
        .from('room_types')
        .update({
          discount_rate: isCancel ? 0 : normalizedDiscount,
          discount_quota: quota,
          discount_periods: isCancel ? [] : normalizedPeriods
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

  const roomTypeIdsForUpdate = (roomTypes || []).map((room) => room.id).filter((id) => Number.isFinite(Number(id)))
  const today = formatDateOnly(new Date())
  const usedResultForUpdate = await getActiveOrderQtyMap({ roomTypeIds: roomTypeIdsForUpdate, checkIn: today, checkOut: '9999-12-31' })
  if (!usedResultForUpdate.ok) {
    return { ok: false, status: 500, message: usedResultForUpdate.message }
  }

  const results = await Promise.all(
    (roomTypes || []).map(async (room) => {
      const currentStock = normalizeNumber(room.stock)
      const used = usedResultForUpdate.map.get(room.id) || 0

      if (action === 'offline') {
        const { data: updated, error: updateError } = await supabase
          .from('room_types')
          .update({ is_active: false })
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

      const { data: updated, error: updateError } = await supabase
        .from('room_types')
        .update({ stock: nextStock })
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

  const roomTypeIds = (roomTypes || []).map((room) => room.id).filter((id) => Number.isFinite(Number(id)))
  const usedResult = await getActiveOrderQtyMap({ roomTypeIds, asOfDate: new Date() })
  if (!usedResult.ok) {
    return { ok: false, status: 500, message: usedResult.message }
  }

  const totals = (roomTypes || []).reduce(
    (acc, room) => {
      const stock = normalizeNumber(room.stock)
      const used = usedResult.map.get(room.id) || 0
      const active = room.is_active !== false
      const { available, offline } = computeRoomAvailability({ stock, used, isActive: active })
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
    .map((key) => ({ month: key, revenue: roundToTwo(monthlyMap[key]) }))

  const roomTypeDaily = Object.values(dailyMap)
    .map((item) => {
      const stock = roomStockMap[item.roomTypeName] || 0
      const occupancyRate = stock ? Math.round((item.nights / stock) * 100) : 0
      return { ...item, revenue: roundToTwo(item.revenue), occupancyRate }
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.roomTypeName.localeCompare(b.roomTypeName))

  const roomTypeMonthly = Object.values(monthlyRoomMap)
    .map((item) => {
      const stock = roomStockMap[item.roomTypeName] || 0
      const [year, month] = item.month.split('-').map((v) => Number(v))
      const daysInMonth = year && month ? new Date(year, month, 0).getDate() : 0
      const occupancyRate = stock && daysInMonth ? Math.round((item.nights / (stock * daysInMonth)) * 100) : 0
      return { ...item, revenue: roundToTwo(item.revenue), occupancyRate }
    })
    .sort((a, b) => a.month.localeCompare(b.month) || a.roomTypeName.localeCompare(b.roomTypeName))

  const roomTypeSummary = Object.values(summaryMap).map((item) => {
    const stock = roomStockMap[item.roomTypeName] || 0
    const daysCount = item.days.size || 1
    const occupancyRate = stock ? Math.round((item.nights / (stock * daysCount)) * 100) : 0
    return {
      roomTypeName: item.roomTypeName,
      nights: item.nights,
      revenue: roundToTwo(item.revenue),
      occupancyRate
    }
  }).sort((a, b) => b.revenue - a.revenue)

  return { ok: true, status: 200, data: { totalOrders: data?.length || 0, revenue: roundToTwo(revenue), statusStats, monthly, roomTypeDaily, roomTypeMonthly, roomTypeSummary } }
}

const getMerchantOverview = async ({ merchantId }) => {
  const { data: hotels, error } = await supabase
    .from('hotels')
    .select('id, name, status, created_at')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })

  if (error) {
    return { ok: false, status: 500, message: '获取酒店统计失败：' + error.message }
  }

  const hotelIds = (hotels || []).map((hotel) => hotel.id)
  const { data: roomTypes } = hotelIds.length
    ? await supabase.from('room_types').select('id, hotel_id, name, stock, is_active')
      .in('hotel_id', hotelIds)
    : { data: [] }

  const roomTypeIds = (roomTypes || []).map((room) => room.id).filter((id) => Number.isFinite(Number(id)))
  const usedResult = await getActiveOrderQtyMap({ roomTypeIds, asOfDate: new Date() })
  if (!usedResult.ok) {
    return { ok: false, status: 500, message: usedResult.message }
  }

  const totals = { totalRooms: 0, usedRooms: 0, availableRooms: 0, offlineRooms: 0, roomTypeCount: 0 }
  const hotelStatsMap = new Map()

  ;(hotels || []).forEach((hotel) => {
    hotelStatsMap.set(hotel.id, {
      hotelId: hotel.id,
      name: hotel.name,
      status: hotel.status,
      createdAt: hotel.created_at,
      totalRooms: 0,
      usedRooms: 0,
      availableRooms: 0,
      offlineRooms: 0,
      roomTypeCount: 0
    })
  })

  ;(roomTypes || []).forEach((room) => {
    const stock = normalizeNumber(room.stock)
    const used = usedResult.map.get(room.id) || 0
    const active = room.is_active !== false
    const { available, offline } = computeRoomAvailability({ stock, used, isActive: active })
    totals.totalRooms += stock
    totals.usedRooms += used
    totals.offlineRooms += offline
    totals.availableRooms += available
    totals.roomTypeCount += 1

    const hotelStats = hotelStatsMap.get(room.hotel_id)
    if (hotelStats) {
      hotelStats.totalRooms += stock
      hotelStats.usedRooms += used
      hotelStats.offlineRooms += offline
      hotelStats.availableRooms += available
      hotelStats.roomTypeCount += 1
    }
  })

  const hotelStats = (hotels || []).map((hotel) => {
    const item = hotelStatsMap.get(hotel.id)
    const activeRooms = Math.max((item?.totalRooms || 0) - (item?.offlineRooms || 0), 0)
    const occupancyRate = activeRooms ? roundToTwo(((item?.usedRooms || 0) / activeRooms) * 100) : 0
    const availableRate = activeRooms ? roundToTwo(((item?.availableRooms || 0) / activeRooms) * 100) : 0
    const offlineRate = (item?.totalRooms || 0) ? roundToTwo(((item?.offlineRooms || 0) / (item?.totalRooms || 0)) * 100) : 0
    return { ...item, occupancyRate, availableRate, offlineRate }
  })

  const totalActiveRooms = Math.max(totals.totalRooms - totals.offlineRooms, 0)
  const occupancyRate = totalActiveRooms ? roundToTwo((totals.usedRooms / totalActiveRooms) * 100) : 0
  const availableRate = totalActiveRooms ? roundToTwo((totals.availableRooms / totalActiveRooms) * 100) : 0
  const offlineRate = totals.totalRooms ? roundToTwo((totals.offlineRooms / totals.totalRooms) * 100) : 0

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

  const monthlyRevenue = roundToTwo((orders || []).reduce((sum, order) => sum + normalizeNumber(order.total_price), 0))

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
    lat,
    lng,
    promotions,
    roomTypes
  } = payload || {}

  if (!name || !address || !city) {
    return { ok: false, status: 400, message: 'name、address、city 为必填项' }
  }
  const parsedLat = parseCoordinate(lat, { min: -90, max: 90, label: '纬度(lat)' })
  if (parsedLat.invalid) {
    return { ok: false, status: 400, message: parsedLat.message }
  }
  const parsedLng = parseCoordinate(lng, { min: -180, max: 180, label: '经度(lng)' })
  if (parsedLng.invalid) {
    return { ok: false, status: 400, message: parsedLng.message }
  }

  const normalizedName = String(name).trim()
  const normalizedCity = normalizeCityName(city)
  const { data: existingHotel, error: existingError } = await supabase
    .from('hotels')
    .select('id')
    .ilike('name', normalizedName)
    .limit(1)

  if (existingError) {
    return { ok: false, status: 500, message: '校验酒店名称失败：' + existingError.message }
  }
  if (existingHotel && existingHotel.length > 0) {
    return { ok: false, status: 400, message: '酒店名称已存在' }
  }

  // 创建酒店
  const { data: newHotel, error: hotelError } = await supabase
    .from('hotels')
    .insert({
      merchant_id: merchantId,
      name: normalizedName,
      name_en: name_en || '',
      address,
      city: normalizedCity,
      star_rating: Number(star_rating) || 0,
      opening_time: opening_time || '',
      description: description || '',
      facilities: normalizeArray(facilities),
      images: normalizeArray(images),
      nearby_attractions: normalizeArray(nearby_attractions),
      nearby_transport: normalizeArray(nearby_transport),
      nearby_malls: normalizeArray(nearby_malls),
      ...(parsedLat.provided ? { lat: parsedLat.value } : {}),
      ...(parsedLng.provided ? { lng: parsedLng.value } : {}),
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
        discount_rate: bestDiscount,
        discount_quota: bestDiscount !== 0 ? 999 : 0,
        capacity: room.capacity !== undefined ? Number(room.capacity) || 0 : undefined,
        bed_width: room.bed_width !== undefined ? Number(room.bed_width) || 0 : undefined,
        area: room.area !== undefined ? Number(room.area) || 0 : undefined,
        ceiling_height: room.ceiling_height !== undefined ? Number(room.ceiling_height) || 0 : undefined,
        wifi: room.wifi !== undefined ? !!room.wifi : undefined,
        breakfast_included: room.breakfast_included !== undefined ? !!room.breakfast_included : undefined,
        images: normalizeArray(room.images),
        is_active: true
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
    lat,
    lng,
    promotions,
    roomTypes
  } = payload || {}
  const parsedLat = parseCoordinate(lat, { min: -90, max: 90, label: '纬度(lat)' })
  if (parsedLat.invalid) {
    return { ok: false, status: 400, message: parsedLat.message }
  }
  const parsedLng = parseCoordinate(lng, { min: -180, max: 180, label: '经度(lng)' })
  if (parsedLng.invalid) {
    return { ok: false, status: 400, message: parsedLng.message }
  }

  if (name !== undefined) {
    const normalizedName = String(name).trim()
    if (!normalizedName) {
      return { ok: false, status: 400, message: 'name 不能为空' }
    }
    if (normalizedName !== hotel.name) {
      const { data: existingHotel, error: existingError } = await supabase
        .from('hotels')
        .select('id')
        .ilike('name', normalizedName)
        .neq('id', hotelId)
        .limit(1)

      if (existingError) {
        return { ok: false, status: 500, message: '校验酒店名称失败：' + existingError.message }
      }
      if (existingHotel && existingHotel.length > 0) {
        return { ok: false, status: 400, message: '酒店名称已存在' }
      }
    }
  }

  // 构建更新对象
  const updates = {
    status: 'pending',
    reject_reason: ''
  }

  if (name !== undefined) updates.name = String(name).trim()
  if (name_en !== undefined) updates.name_en = name_en
  if (address !== undefined) updates.address = address
  if (city !== undefined) updates.city = normalizeCityName(city)
  if (star_rating !== undefined) updates.star_rating = Number(star_rating) || 0
  if (opening_time !== undefined) updates.opening_time = opening_time
  if (description !== undefined) updates.description = description
  if (facilities !== undefined) updates.facilities = normalizeArray(facilities)
  if (images !== undefined) updates.images = normalizeArray(images)
  if (nearby_attractions !== undefined) updates.nearby_attractions = normalizeArray(nearby_attractions)
  if (nearby_transport !== undefined) updates.nearby_transport = normalizeArray(nearby_transport)
  if (nearby_malls !== undefined) updates.nearby_malls = normalizeArray(nearby_malls)
  if (parsedLat.provided) updates.lat = parsedLat.value
  if (parsedLng.provided) updates.lng = parsedLng.value
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
  let archiveWarning = null
  if (Array.isArray(roomTypes)) {
    const { data: existingRoomTypes, error: existingRoomTypesError } = await supabase
      .from('room_types')
      .select('*')
      .eq('hotel_id', hotelId)
    if (existingRoomTypesError) {
      return { ok: false, status: 500, message: '获取房型失败：' + existingRoomTypesError.message }
    }

    const normalizedIncoming = roomTypes
      .filter((room) => room && room.name)
      .map((room) => ({
        id: room.id ? Number(room.id) : undefined,
        hotel_id: hotelId,
        name: room.name,
        price: Number(room.price) || 0,
        stock: Number(room.stock) || 0,
        discount_rate: Number(room.discount_rate) || 0,
        discount_quota: Number(room.discount_quota) || 0,
        discount_periods: normalizeArray(room.discount_periods),
        capacity: room.capacity !== undefined ? Number(room.capacity) || 0 : undefined,
        bed_width: room.bed_width !== undefined ? Number(room.bed_width) || 0 : undefined,
        area: room.area !== undefined ? Number(room.area) || 0 : undefined,
        ceiling_height: room.ceiling_height !== undefined ? Number(room.ceiling_height) || 0 : undefined,
        wifi: room.wifi !== undefined ? !!room.wifi : undefined,
        breakfast_included: room.breakfast_included !== undefined ? !!room.breakfast_included : undefined,
        images: normalizeArray(room.images),
        is_active: room.is_active !== undefined ? !!room.is_active : undefined
      }))

    const existingByName = new Map((existingRoomTypes || []).map((room) => [room.name, room]))
    const incomingWithResolvedId = normalizedIncoming.map((room) => {
      if (room.id) return room
      const existing = existingByName.get(room.name)
      if (existing && existing.id) {
        const nextActive = room.is_active !== undefined ? room.is_active : existing.is_active
        return { ...room, id: existing.id, is_active: nextActive }
      }
      return room
    })

    const existingIds = new Set((existingRoomTypes || []).map((room) => room.id).filter((id) => Number.isFinite(id)))
    const incomingIds = new Set(incomingWithResolvedId.map((room) => room.id).filter((id) => Number.isFinite(id)))

    const existingIdList = Array.from(existingIds)
    const orderRows = existingIdList.length
      ? await supabase
        .from('orders')
        .select('room_type_id, status, quantity')
        .in('room_type_id', existingIdList)
      : { data: [], error: null }
    if (orderRows.error) {
      return { ok: false, status: 500, message: '校验房型订单失败：' + orderRows.error.message }
    }
    const anyOrderMap = new Map()
    ;(orderRows.data || []).forEach((row) => {
      const roomId = row.room_type_id
      anyOrderMap.set(roomId, true)
    })

    const today = formatDateOnly(new Date())
    const usedResult = await getActiveOrderQtyMap({ roomTypeIds: existingIdList, checkIn: today, checkOut: '9999-12-31' })
    if (!usedResult.ok) {
      return { ok: false, status: 500, message: usedResult.message }
    }
    const activeQtyMap = usedResult.map

    const stockViolations = incomingWithResolvedId.find((room) => {
      if (!room.id || !existingIds.has(room.id)) return false
      const activeQty = activeQtyMap.get(room.id) || 0
      if (activeQty <= 0) return false
      return normalizeNumber(room.stock) < activeQty
    })
    if (stockViolations) {
      const activeQty = activeQtyMap.get(stockViolations.id) || 0
      return { ok: false, status: 400, message: `房型 ${stockViolations.name} 库存不能小于在住/未退房订单占用数量 ${activeQty}` }
    }

    const updateTargets = incomingWithResolvedId.filter((room) => room.id && existingIds.has(room.id))
    for (const room of updateTargets) {
      const { id, ...updates } = room
      const { error: updateRoomError } = await supabase
        .from('room_types')
        .update(updates)
        .eq('id', id)
      if (updateRoomError) {
        return { ok: false, status: 500, message: '更新房型失败：' + updateRoomError.message }
      }
    }

    const insertTargets = incomingWithResolvedId
      .filter((room) => !room.id)
      .map(({ id, ...rest }) => rest)
    if (insertTargets.length > 0) {
      const { error: insertRoomsError } = await supabase
        .from('room_types')
        .insert(insertTargets)
      if (insertRoomsError) {
        return { ok: false, status: 500, message: '插入房型失败：' + insertRoomsError.message }
      }
    }

    const removedRooms = (existingRoomTypes || [])
      .filter((room) => room && room.id && !incomingIds.has(room.id))
    const toArchive = removedRooms.filter((room) => anyOrderMap.get(room.id))
    const toDeactivate = removedRooms

    if (toArchive.length > 0) {
      const archiveNames = toArchive.map((room) => room.name).filter((name) => name)
      if (archiveNames.length) {
        archiveWarning = `房型 ${archiveNames.join('、')} 已有关联订单，已自动标记为下架`
      } else {
        archiveWarning = '存在已被订单引用的房型，已自动标记为下架'
      }
    }

    if (toDeactivate.length > 0) {
      const deactivateResults = await Promise.all(
        toDeactivate.map(async (room) => {
          const { error: deactivateError } = await supabase
            .from('room_types')
            .update({ is_active: false })
            .eq('id', room.id)
          return deactivateError ? deactivateError : null
        })
      )
      const deactivateError = deactivateResults.find((err) => err)
      if (deactivateError) {
        return { ok: false, status: 500, message: '下架房型失败：' + deactivateError.message }
      }
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

  const currentRoomTypeIds = (currentRoomTypes || []).map((room) => room.id).filter((id) => Number.isFinite(Number(id)))
  const usedResult = await getActiveOrderQtyMap({ roomTypeIds: currentRoomTypeIds, asOfDate: new Date() })
  if (!usedResult.ok) {
    return { ok: false, status: 500, message: usedResult.message }
  }
  const enrichedRoomTypes = (currentRoomTypes || []).map((room) => ({
    ...room,
    used_stock: usedResult.map.get(room.id) || 0
  }))

  return { ok: true, status: 200, data: { ...updatedHotel, roomTypes: enrichedRoomTypes }, warning: archiveWarning }
}

// 应用优惠到房型
const applyPromotionsToRooms = async () => {
  return true
}

const applyMerchantHotelFilters = ({ query, status, keyword, city }) => {
  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  if (city && city !== 'all') {
    query = query.eq('city', city)
  }

  const normalizedKeyword = String(keyword || '').trim()
  if (normalizedKeyword) {
    const safeKeyword = normalizedKeyword.replace(/[(),]/g, ' ').replace(/\s+/g, ' ').trim()
    if (safeKeyword) {
      query = query.or(`name.ilike.%${safeKeyword}%,name_en.ilike.%${safeKeyword}%,address.ilike.%${safeKeyword}%`)
    }
  }

  return query
}

// 商户酒店列表
const listMerchantHotels = async ({ merchantId, status, keyword, city, page, pageSize }) => {
  const shouldPaginate = page !== undefined || pageSize !== undefined

  if (!shouldPaginate) {
    let query = supabase
      .from('hotels')
      .select('*')
      .eq('merchant_id', merchantId)

    query = applyMerchantHotelFilters({ query, status, keyword, city })
    query = query.order('created_at', { ascending: false })

    const { data: hotels, error } = await query

    if (error) {
      return { ok: false, status: 500, message: '查询失败：' + error.message }
    }

    const hotelIds = (hotels || []).map((h) => h.id)
    const priceMap = await getLowestPrices(hotelIds)
    const roomTypeMap = {}

    if (hotelIds.length) {
      const { data: roomTypes } = await supabase
        .from('room_types')
        .select('id, hotel_id, name, price, stock, is_active, discount_rate, discount_quota')
        .in('hotel_id', hotelIds)

      const roomTypeIds = (roomTypes || []).map((room) => room.id).filter((id) => Number.isFinite(Number(id)))
      const usedResult = await getActiveOrderQtyMap({ roomTypeIds, asOfDate: new Date() })
      if (!usedResult.ok) {
        return { ok: false, status: 500, message: usedResult.message }
      }

      ;(roomTypes || []).forEach((room) => {
        const used = usedResult.map.get(room.id) || 0
        const enrichedRoom = { ...room, used_stock: used }
        if (!roomTypeMap[room.hotel_id]) {
          roomTypeMap[room.hotel_id] = []
        }
        roomTypeMap[room.hotel_id].push(enrichedRoom)
      })
    }

    const enriched = (hotels || []).map((hotel) => ({
      ...hotel,
      lowestPrice: priceMap[hotel.id],
      roomTypes: roomTypeMap[hotel.id] || []
    }))

    return { ok: true, status: 200, data: enriched }
  }

  const normalizedPage = Math.max(Number(page) || 1, 1)
  const normalizedPageSize = Math.max(Number(pageSize) || 10, 1)
  const from = (normalizedPage - 1) * normalizedPageSize
  const to = from + normalizedPageSize - 1

  let query = supabase
    .from('hotels')
    .select('*', { count: 'exact' })
    .eq('merchant_id', merchantId)

  query = applyMerchantHotelFilters({ query, status, keyword, city })
  query = query
    .order('created_at', { ascending: false })
    .range(from, to)

  const { data: hotels, error, count } = await query
  if (error) {
    return { ok: false, status: 500, message: '查询失败：' + error.message }
  }

  const hotelIds = (hotels || []).map((item) => item.id)
  const priceMap = await getLowestPrices(hotelIds)
  const roomTypeCountMap = await getRoomTypeCountMap(hotelIds)

  const enriched = (hotels || []).map((hotel) => ({
    ...hotel,
    lowestPrice: priceMap[hotel.id],
    roomTypeCount: roomTypeCountMap[hotel.id] || 0
  }))

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

const listMerchantHotelCities = async ({ merchantId }) => {
  const { data, error } = await supabase
    .from('hotels')
    .select('city')
    .eq('merchant_id', merchantId)

  if (error) {
    return { ok: false, status: 500, message: '查询城市列表失败：' + error.message }
  }

  const cities = [...new Set((data || []).map((item) => String(item?.city || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'zh-CN'))

  return { ok: true, status: 200, data: cities }
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

  const roomTypeIds = (roomTypes || []).map((room) => room.id).filter((id) => Number.isFinite(Number(id)))
  const usedResult = await getActiveOrderQtyMap({ roomTypeIds, asOfDate: new Date() })
  if (!usedResult.ok) {
    return { ok: false, status: 500, message: usedResult.message }
  }
  const orderRows = roomTypeIds.length
    ? await supabase
      .from('orders')
      .select('room_type_id')
      .in('room_type_id', roomTypeIds)
    : { data: [], error: null }
  if (orderRows.error) {
    return { ok: false, status: 500, message: '查询房型订单失败：' + orderRows.error.message }
  }
  const orderRoomSet = new Set((orderRows.data || []).map((row) => row.room_type_id))
  const enrichedRoomTypes = enrichRoomTypesWithPricing({
    roomTypes,
    promotions: hotel?.promotions,
    pricingContext: { asOfDate: new Date() },
    usedStockMap: usedResult.map,
    orderRoomSet
  })

  return { ok: true, status: 200, data: { ...hotel, roomTypes: enrichedRoomTypes } }
}

// 管理员酒店列表
const listAdminHotels = async ({ status, keyword, city, page, pageSize }) => {
  const shouldPaginate = page !== undefined || pageSize !== undefined

  const pendingDeleteResult = await getPendingDeleteHotelIds()
  if (!pendingDeleteResult.ok) {
    return pendingDeleteResult
  }
  const excludeIds = pendingDeleteResult.data || []

  if (!shouldPaginate) {
    let query = supabase.from('hotels').select('*')
    query = applyAdminHotelFilters({ query, status, keyword, city, excludeIds })
    query = query.order('created_at', { ascending: false })

    const { data: hotels, error } = await query
    if (error) {
      return { ok: false, status: 500, message: '查询失败：' + error.message }
    }

    const hotelIds = (hotels || []).map((h) => h.id)
    const priceMap = await getLowestPrices(hotelIds)
    const roomTypeCountMap = await getRoomTypeCountMap(hotelIds)

    const enriched = (hotels || []).map((hotel) => ({
      ...hotel,
      lowestPrice: priceMap[hotel.id],
      roomTypeCount: roomTypeCountMap[hotel.id] || 0
    }))

    return { ok: true, status: 200, data: enriched }
  }

  const normalizedPage = Math.max(Number(page) || 1, 1)
  const normalizedPageSize = Math.max(Number(pageSize) || 10, 1)
  const from = (normalizedPage - 1) * normalizedPageSize
  const to = from + normalizedPageSize - 1

  let query = supabase
    .from('hotels')
    .select('*', { count: 'exact' })

  query = applyAdminHotelFilters({ query, status, keyword, city, excludeIds })
  query = query
    .order('created_at', { ascending: false })
    .range(from, to)

  const { data: hotels, error, count } = await query
  if (error) {
    return { ok: false, status: 500, message: '查询失败：' + error.message }
  }

  const hotelIds = (hotels || []).map((h) => h.id)
  const priceMap = await getLowestPrices(hotelIds)
  const roomTypeCountMap = await getRoomTypeCountMap(hotelIds)
  const statsResult = await getAdminHotelStats({ excludeIds })
  if (!statsResult.ok) {
    return statsResult
  }

  const enriched = (hotels || []).map((hotel) => ({
    ...hotel,
    lowestPrice: priceMap[hotel.id],
    roomTypeCount: roomTypeCountMap[hotel.id] || 0
  }))

  return {
    ok: true,
    status: 200,
    data: {
      page: normalizedPage,
      pageSize: normalizedPageSize,
      total: count || 0,
      list: enriched,
      stats: statsResult.data
    }
  }
}

const listAdminHotelCities = async () => {
  const pendingDeleteResult = await getPendingDeleteHotelIds()
  if (!pendingDeleteResult.ok) {
    return pendingDeleteResult
  }

  let query = supabase
    .from('hotels')
    .select('id, city')

  const inFilter = buildIdInFilter(pendingDeleteResult.data || [])
  if (inFilter) {
    query = query.not('id', 'in', inFilter)
  }

  const { data, error } = await query
  if (error) {
    return { ok: false, status: 500, message: '查询城市列表失败：' + error.message }
  }

  const cities = [...new Set((data || []).map((item) => String(item?.city || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'zh-CN'))

  return { ok: true, status: 200, data: cities }
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

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  return d;
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
    tags, // comma separated strings '免费WiFi,停车场'
    minPrice,
    maxPrice,
    userLat,
    userLng,
    page = 1,
    pageSize = 10,
    rooms,
    guests
  } = query || {}
  const pricingContext = { checkIn, checkOut }

  const normalizedPage = Math.max(Number(page) || 1, 1)
  const normalizedPageSize = Math.max(Number(pageSize) || 10, 1)
  const offset = (normalizedPage - 1) * normalizedPageSize
  const tagList = parseCsvList(tags)
  const minPriceValue = Number(minPrice)
  const maxPriceValue = Number(maxPrice)
  const hasMinPrice = minPrice !== undefined && minPrice !== null && String(minPrice).trim() !== '' && Number.isFinite(minPriceValue)
  const hasMaxPrice = maxPrice !== undefined && maxPrice !== null && String(maxPrice).trim() !== '' && Number.isFinite(maxPriceValue)
  const needFinalPriceFilter = hasMinPrice || hasMaxPrice
  const normalizePositiveInt = (value) => {
    const num = Number(value)
    if (!Number.isFinite(num) || num <= 0) return null
    return Math.floor(num)
  }
  const normalizedRooms = normalizePositiveInt(rooms)
  const normalizedGuests = normalizePositiveInt(guests)
  const shouldFilterByRoomNeed = Boolean(normalizedRooms || normalizedGuests)
  const inFinalPriceRange = (value) => {
    const num = Number(value)
    if (!Number.isFinite(num)) return false
    if (hasMinPrice && num < minPriceValue) return false
    if (hasMaxPrice && num > maxPriceValue) return false
    return true
  }
  const resolveRequiredRooms = (capacity) => {
    if (normalizedRooms) return normalizedRooms
    if (!normalizedGuests) return null
    if (!Number.isFinite(capacity) || capacity <= 0) return null
    return Math.ceil(normalizedGuests / capacity)
  }
  const filterHotelsByRoomNeed = async (hotels) => {
    if (!shouldFilterByRoomNeed) return { ok: true, data: hotels }
    const hotelIds = (hotels || []).map((hotel) => hotel.id).filter((id) => Number.isFinite(Number(id)))
    if (!hotelIds.length) return { ok: true, data: [] }
    const { data: roomTypes, error } = await supabase
      .from('room_types')
      .select('id, hotel_id, capacity, stock, is_active')
      .in('hotel_id', hotelIds)
    if (error) {
      return { ok: false, status: 500, message: '查询房型失败：' + error.message }
    }
    const roomTypeIds = (roomTypes || []).map((room) => room.id).filter((id) => Number.isFinite(Number(id)))
    const usedResult = await getActiveOrderQtyMap(
      checkIn && checkOut
        ? { roomTypeIds, checkIn, checkOut }
        : { roomTypeIds, asOfDate: new Date() }
    )
    if (!usedResult.ok) {
      return { ok: false, status: 500, message: usedResult.message }
    }
    const matchedHotelIds = new Set()
    ;(roomTypes || []).forEach((room) => {
      const stock = normalizeNumber(room.stock)
      const used = usedResult.map.get(room.id) || 0
      const active = room.is_active !== false
      const available = computeRoomAvailability({ stock, used, isActive: active }).available
      if (available <= 0) return
      const capacity = Number(room.capacity)
      const requiredRooms = resolveRequiredRooms(capacity)
      if (normalizedGuests) {
        if (!Number.isFinite(capacity) || capacity <= 0) return
        const totalCapacity = capacity * (requiredRooms || 0)
        if (totalCapacity < normalizedGuests) return
      }
      if (requiredRooms && available < requiredRooms) return
      matchedHotelIds.add(room.hotel_id)
    })
    const filtered = (hotels || []).filter((hotel) => matchedHotelIds.has(hotel.id))
    return { ok: true, data: filtered }
  }

  let dbQuery = supabase
    .from('hotels')
    .select('*', { count: 'exact' })
    .eq('status', 'approved')

  // --- 智能城市切换逻辑 ---
  let filterCity = city
  let targetLocation = null

  if (keyword) {
    // 1. 优先检查本地城市/省份列表 (Fast & Accurate)
    const matchedCity = cityLookup.get(keyword)
    
    if (matchedCity) {
        // 命中了本地城市库，直接切换城市
        filterCity = matchedCity
        
        // 获取该城市的中心坐标用于后续排序
        try {
            const geo = await mapService.geocode(matchedCity)
            if (geo && geo.location) {
                const [lng, lat] = geo.location.split(',').map(Number)
                targetLocation = { lat, lng }
            }
        } catch (e) { console.error('City geocode error', e) }
    } else {
        // 2. 尝试全局搜索 Keyword (不限制城市)
        const geo = await mapService.geocode(keyword)
        
        if (geo) {
          // 如果 Keyword 是一个明确的行政区划 (省/市/区)，优先切换城市
          const level = geo.level
          const isCityLevel = ['province', 'city', 'district', '省', '市', '区县', '城区', '直辖市'].includes(level)
          
          if (isCityLevel) {
            // 提取城市名称: geo.city 可能是数组或空，geo.province 也是
            // 高德 geocode 返回: city (String/Array), province (String)
            // 通常如果是直辖市，city 可能为空或等于 province
            const newCity = typeof geo.city === 'string' && geo.city.length > 0 ? geo.city : 
                            (typeof geo.province === 'string' ? geo.province : '')
            
            if (newCity) {
               filterCity = newCity
            } else if (geo.formatted_address) {
               // 兜底：如果是 "杭州市"，formatted_address 也是 "杭州市"
               // 简单提取：移除 "省" 后面的部分？或者直接用 formatted_address
               // 风险：formatted_address 可能是 "浙江省杭州市"
               if (geo.formatted_address.includes('市')) {
                 // 简单正则提取市名
                 const match = geo.formatted_address.match(/([^省]+市)/)
                 if (match) filterCity = match[1]
               }
            }
          } 
          // 记录目标坐标用于后续排序
          if (geo.location) {
            const [lng, lat] = geo.location.split(',')
            targetLocation = { lat: Number(lat), lng: Number(lng) }
          }
        }
    }
  }

  if (filterCity) {
    const cleanCity = filterCity.replace(/市$/, '')
    dbQuery = dbQuery.ilike('city', `%${cleanCity}%`)
  }

  // --- Common Filters (Apply before keyword logic) ---
  if (stars) {
    const starList = stars.split(',').map(Number).filter(n => !isNaN(n))
    if (starList.length > 0) {
      dbQuery = dbQuery.in('star_rating', starList)
    }
  }

  // --- 智能排序逻辑 ---
  if (keyword) {
    // 策略：获取所有候选酒店（按城市/价格过滤后），在内存中进行相关性评分
    // 注意：这里我们放宽 DB 搜索条件，不再强制匹配 keyword，而是取回数据后算分
    
    // 如果没有 filterCity，我们尝试基于 keyword 模糊匹配先缩小范围
    if (!filterCity) {
       // facilities.cs.["${keyword}"] is not valid in ilike/or syntax
       // Using simpler OR logic without facilities for initial filter
       let orString = `name.ilike.%${keyword}%,name_en.ilike.%${keyword}%,address.ilike.%${keyword}%`
       dbQuery = dbQuery.or(orString).limit(200)
    } else {
       dbQuery = dbQuery.limit(500)
    }

    const { data: candidates, error, count } = await dbQuery
    
    if (error) {
      return { ok: false, status: 500, message: '查询失败：' + error.message }
    }

    // 修正目标坐标:
    // 如果没有切换城市 (filterCity === city)，说明 Keyword 不是城市名。
    // 此时之前的全局 Geocode 可能返回了外地的 POI (例如搜 "希尔顿" 返回了北京希尔顿)。
    // 我们应该尝试在当前 filterCity 下重新 Geocode 以获取本地 POI 坐标。
    if (filterCity === city) {
        try {
            const localGeo = await mapService.geocode(keyword, filterCity)
            if (localGeo && localGeo.location) {
                const [lng, lat] = localGeo.location.split(',').map(Number)
                targetLocation = { lat, lng }
            }
        } catch (e) { console.error(e) }
    }

    // 计算评分
    const candidateList = (candidates || []).map((hotel) => ({
      ...hotel,
      _tagMatchCount: getMatchedTagCount(hotel?.facilities, tagList)
    })).filter((hotel) => (tagList.length ? hotel._tagMatchCount > 0 : true))
    const keywordText = String(keyword || '')
    let scored = candidateList.map(h => {
      let score = 0
      const name = String(h?.name || '')
      const address = String(h?.address || '')
      const hotelLat = Number(h?.lat ?? h?.latitude)
      const hotelLng = Number(h?.lng ?? h?.longitude)
      const hasHotelCoordinates = Number.isFinite(hotelLat) && Number.isFinite(hotelLng)
      
      // 1. 文本相关性
      if (name === keywordText) score += 100
      else if (name.includes(keywordText)) score += 60
      else if (address.includes(keywordText)) score += 40
      
      // 2. 位置相关性 (Priority 1: Keyword Location)
      if (targetLocation && hasHotelCoordinates) {
        const dist = calculateDistance(targetLocation.lat, targetLocation.lng, hotelLat, hotelLng)
        // 距离越近分越高。假设 5km 内有加分。
        score += Math.max(0, 50 - dist * 5)
      } 
      // 3. 位置相关性 (Priority 2: User Location - 仅当 keyword 不是明确地名或者作为补充)
      else if (userLat && userLng && hasHotelCoordinates) {
        const dist = calculateDistance(Number(userLat), Number(userLng), hotelLat, hotelLng)
        score += Math.max(0, 20 - dist * 2)
      }

      return { ...h, _score: score, _dist: targetLocation && hasHotelCoordinates ? calculateDistance(targetLocation.lat, targetLocation.lng, hotelLat, hotelLng) : 0 }
    })

    // 过滤掉相关性太低的结果
    if (filterCity) {
        scored = scored.filter(h => {
            const hotelName = String(h?.name || '')
            const hotelAddress = String(h?.address || '')
            const hotelNameEn = String(h?.name_en || '')
            // 如果 keyword 在名字/地址/设施里
            const textMatch = hotelName.includes(keywordText) || hotelAddress.includes(keywordText) || 
                              hotelNameEn.includes(keywordText) ||
                              (h.facilities && JSON.stringify(h.facilities).includes(keywordText))
            // 或者有位置加分
            const locMatch = h._score > 0
            return textMatch || locMatch
        })
    }

    const scoredHotelIds = scored.map((hotel) => hotel.id)
    const priceMap = await getLowestPrices(scoredHotelIds, pricingContext)

    let enriched = scored.map((hotel) => ({
      ...hotel,
      lowestPrice: priceMap[hotel.id]
    }))
    if (needFinalPriceFilter) {
      enriched = enriched.filter((hotel) => inFinalPriceRange(hotel.lowestPrice))
    }
    if (shouldFilterByRoomNeed) {
      const roomFilterResult = await filterHotelsByRoomNeed(enriched)
      if (!roomFilterResult.ok) return roomFilterResult
      enriched = roomFilterResult.data
    }
    enriched.sort((a, b) => {
      if (tagList.length) {
        const tagDiff = (b._tagMatchCount || 0) - (a._tagMatchCount || 0)
        if (tagDiff !== 0) return tagDiff
      }
      return (b._score || 0) - (a._score || 0)
    })

    const total = enriched.length
    const pageData = enriched
      .slice(offset, offset + normalizedPageSize)
      .map(({ _tagMatchCount, ...rest }) => rest)

    return {
      ok: true,
      status: 200,
      data: {
        page: normalizedPage,
        pageSize: normalizedPageSize,
        total: total,
        list: pageData
      }
    }
  }

  // --- 原有逻辑 (无 Keyword) ---
  if (needFinalPriceFilter) {
    const { data: hotels, error } = await dbQuery
    if (error) {
      return { ok: false, status: 500, message: '查询失败：' + error.message }
    }

    const filteredHotels = (hotels || []).map((hotel) => ({
      ...hotel,
      _tagMatchCount: getMatchedTagCount(hotel?.facilities, tagList)
    })).filter((hotel) => (tagList.length ? hotel._tagMatchCount > 0 : true))
    const hotelIds = filteredHotels.map((hotel) => hotel.id)
    const priceMap = await getLowestPrices(hotelIds, pricingContext)

    let enriched = filteredHotels.map((hotel) => ({
      ...hotel,
      lowestPrice: priceMap[hotel.id]
    })).filter((hotel) => inFinalPriceRange(hotel.lowestPrice))
    if (shouldFilterByRoomNeed) {
      const roomFilterResult = await filterHotelsByRoomNeed(enriched)
      if (!roomFilterResult.ok) return roomFilterResult
      enriched = roomFilterResult.data
    }

    applyTagAwareSort(enriched, { sort, tagList })

    const total = enriched.length
    const list = enriched
      .slice(offset, offset + normalizedPageSize)
      .map(({ _tagMatchCount, ...rest }) => rest)
    return {
      ok: true,
      status: 200,
      data: {
        page: normalizedPage,
        pageSize: normalizedPageSize,
        total,
        list
      }
    }
  }

  if (tagList.length > 0) {
    const { data: hotels, error } = await dbQuery

    if (error) {
      return { ok: false, status: 500, message: '查询失败：' + error.message }
    }

    const filteredHotels = (hotels || []).map((hotel) => ({
      ...hotel,
      _tagMatchCount: getMatchedTagCount(hotel?.facilities, tagList)
    })).filter((hotel) => (tagList.length ? hotel._tagMatchCount > 0 : true))
    const hotelIds = filteredHotels.map((hotel) => hotel.id)
    const priceMap = await getLowestPrices(hotelIds, pricingContext)

    let enriched = filteredHotels.map((hotel) => ({
      ...hotel,
      lowestPrice: priceMap[hotel.id]
    }))
    if (shouldFilterByRoomNeed) {
      const roomFilterResult = await filterHotelsByRoomNeed(enriched)
      if (!roomFilterResult.ok) return roomFilterResult
      enriched = roomFilterResult.data
    }

    applyTagAwareSort(enriched, { sort, tagList })

    const total = enriched.length
    const list = enriched
      .slice(offset, offset + normalizedPageSize)
      .map(({ _tagMatchCount, ...rest }) => rest)

    return {
      ok: true,
      status: 200,
      data: {
        page: normalizedPage,
        pageSize: normalizedPageSize,
        total,
        list
      }
    }
  }

  if (shouldFilterByRoomNeed) {
    const { data: hotels, error } = await dbQuery
    if (error) {
      return { ok: false, status: 500, message: '查询失败：' + error.message }
    }
    const hotelIds = (hotels || []).map((h) => h.id)
    const priceMap = await getLowestPrices(hotelIds, pricingContext)
    let enriched = (hotels || []).map((hotel) => ({
      ...hotel,
      lowestPrice: priceMap[hotel.id]
    }))
    const roomFilterResult = await filterHotelsByRoomNeed(enriched)
    if (!roomFilterResult.ok) return roomFilterResult
    enriched = roomFilterResult.data
    if (sort === 'price_asc') {
      enriched.sort((a, b) => (a.lowestPrice || 0) - (b.lowestPrice || 0))
    } else if (sort === 'price_desc') {
      enriched.sort((a, b) => (b.lowestPrice || 0) - (a.lowestPrice || 0))
    } else if (sort === 'star' || sort === 'score_desc') {
      enriched.sort((a, b) => (b.star_rating || 0) - (a.star_rating || 0))
    } else if (sort === 'recommend') {
      enriched.sort((a, b) => (b.star_rating || 0) - (a.star_rating || 0) || (a.lowestPrice || 0) - (b.lowestPrice || 0))
    }
    const total = enriched.length
    const list = enriched.slice(offset, offset + normalizedPageSize)
    return {
      ok: true,
      status: 200,
      data: {
        page: normalizedPage,
        pageSize: normalizedPageSize,
        total,
        list
      }
    }
  }

  const { data: hotels, error, count } = await dbQuery.range(offset, offset + normalizedPageSize - 1)

  if (error) {
    return { ok: false, status: 500, message: '查询失败：' + error.message }
  }

  const hotelIds = hotels.map((h) => h.id)
  const priceMap = await getLowestPrices(hotelIds, pricingContext)

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
const getPublicHotel = async ({ hotelId, query }) => {
  const checkIn = query?.checkIn
  const checkOut = query?.checkOut
  const pricingContext = { checkIn, checkOut, asOfDate: new Date() }
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

  const roomTypeIds = (roomTypes || []).map((room) => room.id).filter((id) => Number.isFinite(Number(id)))
  const usedResult = await getActiveOrderQtyMap(
    checkIn && checkOut
      ? { roomTypeIds, checkIn, checkOut }
      : { roomTypeIds, asOfDate: new Date() }
  )
  if (!usedResult.ok) {
    return { ok: false, status: 500, message: usedResult.message }
  }

  const availableRoomTypes = (roomTypes || []).map((room) => {
    const stock = normalizeNumber(room.stock)
    const used = usedResult.map.get(room.id) || 0
    const active = room.is_active !== false
    const available = computeRoomAvailability({ stock, used, isActive: active }).available
    return {
      ...room,
      available_count: available
    }
  }).filter((room) => room.available_count > 0)

  const pricedRoomTypes = availableRoomTypes.map((room) => {
    const pricing = calculateRoomPrice({
      room,
      promotions: hotel.promotions,
      ...pricingContext
    })
    return {
      ...room,
      images: normalizeArray(room.images),
      display_price: pricing.finalPrice,
      base_price: pricing.basePrice,
      promotion_price: pricing.promotionAdjustedPrice,
      has_room_discount: pricing.hasRoomDiscount,
      room_discount_label: pricing.roomDiscountLabel,
      effective_promotions: pricing.effectivePromotions
    }
  }).sort((a, b) => normalizeNumber(a.display_price) - normalizeNumber(b.display_price))

  const lowestPrice = pricedRoomTypes.length > 0 ? normalizeNumber(pricedRoomTypes[0].display_price) : null

  // 所有房型的图片数据（不受库存/激活状态过滤），供幻灯片使用
  const allRoomTypeSlides = (roomTypes || []).map((room) => ({
    id: room.id,
    name: room.name,
    images: normalizeArray(room.images)
  }))

  return {
    ok: true,
    status: 200,
    data: {
      ...hotel,
      lowestPrice,
      roomTypes: pricedRoomTypes,
      allRoomTypeSlides
    }
  }
}

const createPublicOrder = async ({ hotelId, userId, payload }) => {
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
  if (!userId) {
    return { ok: false, status: 401, message: '请先登录后下单' }
  }
  if (!roomTypeId && !roomTypeName) {
    return { ok: false, status: 400, message: 'roomTypeId 或 roomTypeName 不能为空' }
  }
  if (!checkIn || !checkOut) {
    return { ok: false, status: 400, message: '入住和离店日期为必填项' }
  }

  const { data: hotel, error: hotelError } = await supabase
    .from('hotels')
    .select('id, merchant_id, status, name, name_en, promotions')
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
  const active = room.is_active !== false

  let nights = 1
  let checkInValue = null
  let checkOutValue = null

  {
    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) {
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

  const usedResult = await getActiveOrderQtyMap({ roomTypeIds: [room.id], checkIn: checkInValue, checkOut: checkOutValue })
  if (!usedResult.ok) {
    return { ok: false, status: 500, message: usedResult.message }
  }
  const used = usedResult.map.get(room.id) || 0
  const available = computeRoomAvailability({ stock, used, isActive: active }).available

  if (!active) {
    return { ok: false, status: 400, message: '房型已下架' }
  }
  if (available < normalizedQuantity) {
    return { ok: false, status: 400, message: '房型库存不足' }
  }

  const pricing = calculateRoomPrice({
    room,
    promotions: hotel.promotions,
    checkIn: checkInValue,
    checkOut: checkOutValue,
    asOfDate: new Date()
  })
  const pricePerNight = pricing.promotionAdjustedPrice
  const discountedPricePerNight = pricing.finalPrice
  const discountQuota = normalizeNumber(room.discount_quota)
  const hasDiscount = pricing.hasRoomDiscount

  let totalPrice = 0
  let discountCount = 0

  if (hasDiscount) {
    // 只有配额内的数量享受折扣
    discountCount = Math.min(normalizedQuantity, discountQuota)
    const normalCount = normalizedQuantity - discountCount
    totalPrice = (discountedPricePerNight * discountCount + pricePerNight * normalCount) * nights
  } else {
    totalPrice = pricePerNight * normalizedQuantity * nights
  }
  
  totalPrice = Math.round(totalPrice * 100) / 100
  const avgPricePerNight = normalizedQuantity > 0
    ? Math.round((totalPrice / normalizedQuantity / nights) * 100) / 100
    : pricePerNight

  const insertPayload = {
    hotel_id: hotelId,
    merchant_id: hotel.merchant_id,
    user_id: userId,
    room_type_id: room.id,
    room_type_name: room.name,
    quantity: normalizedQuantity,
    price_per_night: avgPricePerNight,
    nights,
    total_price: totalPrice,
    status: 'pending_payment',
    check_in: checkInValue,
    check_out: checkOutValue,
    order_no: generateOrderNo()
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert(insertPayload)
    .select()
    .single()

  if (orderError) {
    return { ok: false, status: 500, message: '创建订单失败：' + orderError.message }
  }

  // 如果使用了折扣配额，更新配额
  if (discountCount > 0) {
    const newQuota = Math.max(0, discountQuota - discountCount)
    await supabase
      .from('room_types')
      .update({ discount_quota: newQuota })
      .eq('id', room.id)
  }

  const hotelName = String(hotel?.name || '').trim()
  const hotelNameEn = String(hotel?.name_en || '').trim()
  return {
    ok: true,
    status: 201,
    data: {
      ...order,
      hotel: hotelName || hotelNameEn ? { id: hotel.id, name: hotelName, name_en: hotelNameEn } : null,
      hotel_name: hotelName,
      hotel_name_en: hotelNameEn
    }
  }
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

  const roomTypeIds = (roomTypes || []).map((room) => room.id).filter((id) => Number.isFinite(Number(id)))
  const usedResult = await getActiveOrderQtyMap({ roomTypeIds, asOfDate: new Date() })
  if (!usedResult.ok) {
    return { ok: false, status: 500, message: usedResult.message }
  }
  const enrichedRoomTypes = enrichRoomTypesWithPricing({
    roomTypes,
    promotions: hotel?.promotions,
    pricingContext: { asOfDate: new Date() },
    usedStockMap: usedResult.map
  })

  return { ok: true, status: 200, data: { ...hotel, roomTypes: enrichedRoomTypes } }
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
  listMerchantHotelCities,
  getMerchantHotel,
  listAdminHotels,
  listAdminHotelCities,
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
  applyPromotionsToRooms,
  getLowestPrices
}
