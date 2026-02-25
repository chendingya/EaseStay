/**
 * 地图服务 - 高德地图 API 代理
 */

const mapService = require('../services/mapService')

/**
 * POI 搜索
 */
async function searchPOI(req, res) {
  const { keywords, city } = req.query
  
  if (!keywords) {
    return res.status(400).json({ success: false, error: '请输入搜索关键词' })
  }

  const results = await mapService.searchPOI(keywords, city)
  res.json({ success: true, data: results.slice(0, 10) })
}

/**
 * 地理编码 - 地址转坐标
 */
async function geocode(req, res) {
  const { address, city } = req.query
  
  if (!address) {
    return res.status(400).json({ success: false, error: '请输入地址' })
  }

  const result = await mapService.geocode(address, city)
  if (result) {
    res.json({ success: true, data: result })
  } else {
    res.json({ success: false, error: '未找到地址' })
  }
}

/**
 * 逆地理编码 - 坐标转地址
 */
async function regeocode(req, res) {
  const { location } = req.query // location 格式: lng,lat
  
  if (!location) {
    return res.status(400).json({ success: false, error: '请输入坐标' })
  }

  const result = await mapService.regeocode(location)
  if (result) {
    res.json({ success: true, data: result })
  } else {
    res.json({ success: false, error: '未找到地址' })
  }
}

/**
 * 获取某城市所有酒店坐标（用于地图找房）
 * Query params:
 *   city       - 城市名（必填）
 *   targetLng  - 目标 POI 经度（可选，填写后返回距离字段 distanceKm）
 *   targetLat  - 目标 POI 纬度（可选）
 */
async function hotelLocations(req, res) {
  const { city, targetLng, targetLat, sort, stars, tags, minPrice, maxPrice } = req.query
  if (!city) {
    return res.status(400).json({ success: false, error: '请传入城市参数' })
  }

  const targetCoords =
    targetLng && targetLat
      ? { lng: parseFloat(targetLng), lat: parseFloat(targetLat) }
      : null

  const filters = {
    sort: sort || 'recommend',
    stars: stars ? stars.split(',').filter(Boolean) : null,
    tags: tags ? decodeURIComponent(tags).split(',').filter(Boolean) : null,
    minPrice: minPrice || null,
    maxPrice: maxPrice || null,
  }

  try {
    const hotels = await mapService.getHotelLocations(city, targetCoords, filters)
    res.json({ success: true, data: hotels })
  } catch (err) {
    console.error('hotelLocations error:', err)
    res.status(500).json({ success: false, error: '获取酒店坐标失败' })
  }
}

module.exports = {
  searchPOI,
  geocode,
  regeocode,
  hotelLocations,
}

