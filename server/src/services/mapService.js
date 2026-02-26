const AMAP_KEY = process.env.AMAP_KEY || ''
const supabase = require('../config/supabase')
const { getMockByCity, getMockAddressPool } = require('../data/mockHotelLocations')
const { calculateRoomPrice } = require('./pricingService')
const { getActiveOrderQtyMap, computeRoomAvailability } = require('./roomAvailabilityService')

// 内存缓存：地址 → { lng, lat }，避免重复 geocode 同一地址
const geocodeCache = new Map()

/**
 * 地理编码 - 地址转坐标
 * @param {string} address 地址
 * @param {string} city 城市（可选）
 */
async function geocode(address, city) {
  if (!address) return null
  if (!AMAP_KEY) {
      // 模拟数据
      return { location: '121.4737,31.2304', formatted_address: address }
  }

  try {
    const url = `https://restapi.amap.com/v3/geocode/geo?key=${AMAP_KEY}&address=${encodeURIComponent(address)}&city=${encodeURIComponent(city || '')}`
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.status === '1' && data.geocodes?.[0]) {
      return data.geocodes[0]
    }
    return null
  } catch (err) {
    console.error('地理编码失败:', err)
    return null
  }
}

/**
 * 逆地理编码 - 坐标转地址
 * @param {string} location 坐标 'lng,lat'
 */
async function regeocode(location) {
  if (!location) return null
  if (!AMAP_KEY) {
      return { 
          formatted_address: '上海市浦东新区', 
          city: '上海市',
          addressComponent: { city: '上海市', province: '上海市', district: '浦东新区' }
      }
  }

  try {
    const url = `https://restapi.amap.com/v3/geocode/regeo?key=${AMAP_KEY}&location=${location}`
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.status === '1' && data.regeocode) {
      return data.regeocode
    }
    return null
  } catch (err) {
    console.error('逆地理编码失败:', err)
    return null
  }
}

/**
 * POI 搜索
 * @param {string} keywords 
 * @param {string} city 
 */
async function searchPOI(keywords, city) {
    if (!keywords) return []
    if (!AMAP_KEY) {
        return [
            { name: keywords + ' 市中心', address: keywords + '市人民路100号', location: '121.47,31.23', cityname: keywords },
            { name: keywords + ' 火车站附近', address: keywords + '市站前路88号', location: '121.48,31.24', cityname: keywords },
            { name: keywords + ' 商业区', address: keywords + '市商城路66号', location: '121.46,31.22', cityname: keywords }
        ]
    }

    try {
        const url = `https://restapi.amap.com/v3/place/text?key=${AMAP_KEY}&keywords=${encodeURIComponent(keywords)}&city=${encodeURIComponent(city || '')}&citylimit=false&output=json`
        const response = await fetch(url)
        const data = await response.json()
        
        if (data.status === '1' && data.pois) {
            return data.pois
        }
        return []
    } catch (err) {
        console.error('POI搜索失败:', err)
        return []
    }
}

/**
 * Haversine 球面距离（km）
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

/**
 * 带缓存的单地址 geocode，返回 { lng, lat } 或 null
 */
async function geocodeAddress(address, city) {
  const cacheKey = `${city}::${address}`
  if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey)

  const result = await geocode(address, city)
  if (!result || !result.location) return null

  const [lngStr, latStr] = result.location.split(',')
  const coords = { lng: parseFloat(lngStr), lat: parseFloat(latStr) }
  geocodeCache.set(cacheKey, coords)
  return coords
}

/**
 * 获取某城市所有已上架酒店的坐标，并（可选）计算与目标 POI 的直线距离
 * @param {string} city
 * @param {{ lat: number, lng: number } | null} targetCoords - 目标地点坐标（用于计算距离）
 * @param {{ sort, stars, tags, minPrice, maxPrice }} filters
 */
async function getHotelLocations(city, targetCoords, filters = {}) {
  const { sort = 'recommend', stars, tags, minPrice, maxPrice } = filters

  // ── 1. 查 DB 获取真实酒店数据 ──────────────────────────────
  let dbQuery = supabase
    .from('hotels')
    .select('id, name, name_en, address, city, star_rating, images, opening_time, description, facilities, nearby_attractions, nearby_transport, nearby_malls, promotions')
    .eq('status', 'approved')
    .ilike('city', `%${city}%`)
    .limit(200)

  if (Array.isArray(stars) && stars.length > 0) {
    dbQuery = dbQuery.in('star_rating', stars.map(Number))
  }

  const { data: hotels, error } = await dbQuery

  // ── 2. 查各酒店最低价格（与 hotelService.getLowestPrices 逻辑完全一致） ───
  let priceMap = {}
  if (!error && hotels && hotels.length > 0) {
    const hotelIds = hotels.map(h => h.id)

    const { data: roomTypes } = await supabase
      .from('room_types')
      .select('id, hotel_id, price, discount_rate, discount_quota, discount_periods, stock, is_active')
      .in('hotel_id', hotelIds)

    // 构建酒店 promotions map（hotels 查询已包含 promotions 字段）
    const hotelPromoMap = {}
    hotels.forEach(h => {
      hotelPromoMap[h.id] = Array.isArray(h.promotions) ? h.promotions : []
    })

    hotelIds.forEach(id => { priceMap[id] = null })

    // 通过实际订单动态计算已用库存（与详情页一致）
    let usedMap = new Map()
    if (roomTypes && roomTypes.length) {
      const roomTypeIds = roomTypes.map(r => r.id).filter(id => Number.isFinite(Number(id)))
      const usedResult = await getActiveOrderQtyMap({ roomTypeIds, asOfDate: new Date() })
      if (usedResult.ok) {
        usedMap = usedResult.map
      }
    }

    if (roomTypes) {
      roomTypes.forEach(room => {
        const active = room.is_active !== false
        const stock = Number.isFinite(Number(room.stock)) ? Number(room.stock) : 0
        const used = usedMap.get(room.id) || 0
        const available = computeRoomAvailability({ stock, used, isActive: active }).available
        if (available <= 0) return
        const promos = hotelPromoMap[room.hotel_id] || []
        const { finalPrice } = calculateRoomPrice({
          room,
          promotions: promos,
          asOfDate: new Date()
        })
        if (priceMap[room.hotel_id] === null || finalPrice < priceMap[room.hotel_id]) {
          priceMap[room.hotel_id] = finalPrice
        }
      })
    }
  }

  // ── 3. 用 mock 地址池为每个 DB 酒店分配真实坐标 ────────────
  // DB 中的地址为测试填写（不真实），改用 mock 地址池轮流分配
  // 展示地址也替换为 mock 真实地址，保留酒店其他真实信息
  const addressPool = getMockAddressPool(city)
  const dbHotels = error || !hotels ? [] : hotels
  let results = []

  if (dbHotels.length > 0 && addressPool.length > 0) {
    results = dbHotels.map((hotel, idx) => {
      const mockAddr = addressPool[idx % addressPool.length]
      const item = {
        ...hotel,
        // 用 mock 真实地址替换 DB 测试地址
        address: mockAddr.address,
        lowestPrice: priceMap[hotel.id] ?? null,
        lng: mockAddr.lng,
        lat: mockAddr.lat,
      }
      if (targetCoords) {
        item.distanceKm = parseFloat(
          haversineKm(targetCoords.lat, targetCoords.lng, mockAddr.lat, mockAddr.lng).toFixed(2)
        )
      }
      return item
    })
  }

  // ── 4. DB 无数据时降级到完整 mock ──────────────────────────
  if (results.length === 0) {
    let mockData = getMockByCity(city)
    if (Array.isArray(stars) && stars.length > 0) {
      mockData = mockData.filter(h => stars.map(Number).includes(h.star_rating))
    }
    results = mockData.map(m => {
      const item = { ...m }
      if (targetCoords) {
        item.distanceKm = parseFloat(
          haversineKm(targetCoords.lat, targetCoords.lng, m.lat, m.lng).toFixed(2)
        )
      }
      return item
    })
  }

  // 标签筛选（facilities 包含所有所选标签）
  if (Array.isArray(tags) && tags.length > 0) {
    results = results.filter(h => {
      const fac = Array.isArray(h.facilities)
        ? h.facilities
        : (typeof h.facilities === 'string' ? (() => { try { return JSON.parse(h.facilities) } catch { return [] } })() : [])
      return tags.every(tag => fac.includes(tag))
    })
  }

  // 价格区间筛选
  if (minPrice) {
    results = results.filter(h => h.lowestPrice != null && h.lowestPrice >= Number(minPrice))
  }
  if (maxPrice) {
    results = results.filter(h => h.lowestPrice != null && h.lowestPrice <= Number(maxPrice))
  }

  // 排序
  if (sort === 'price_asc') {
    results.sort((a, b) => (a.lowestPrice ?? 99999) - (b.lowestPrice ?? 99999))
  } else if (sort === 'price_desc') {
    results.sort((a, b) => (b.lowestPrice ?? 0) - (a.lowestPrice ?? 0))
  } else if (sort === 'star') {
    results.sort((a, b) => (b.star_rating || 0) - (a.star_rating || 0))
  } else if (targetCoords) {
    // 登预设为 recommend 且有 POI 时，按距离排序
    results.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999))
  }

  return results
}

module.exports = {
  geocode,
  regeocode,
  searchPOI,
  getHotelLocations,
}
