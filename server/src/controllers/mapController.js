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

module.exports = {
  searchPOI,
  geocode,
  regeocode
}
