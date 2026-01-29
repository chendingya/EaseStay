/**
 * 地图服务 - 高德地图 API 代理
 */

const AMAP_KEY = process.env.AMAP_KEY || ''

/**
 * POI 搜索
 */
async function searchPOI(req, res) {
  const { keywords, city } = req.query
  
  if (!keywords) {
    return res.status(400).json({ success: false, error: '请输入搜索关键词' })
  }

  if (!AMAP_KEY) {
    // 无 API Key 时返回模拟数据
    const mockResults = [
      { name: keywords + ' 市中心', address: keywords + '市人民路100号', location: '121.47,31.23', cityname: keywords },
      { name: keywords + ' 火车站附近', address: keywords + '市站前路88号', location: '121.48,31.24', cityname: keywords },
      { name: keywords + ' 商业区', address: keywords + '市商城路66号', location: '121.46,31.22', cityname: keywords }
    ]
    return res.json({ success: true, data: mockResults })
  }

  try {
    const url = `https://restapi.amap.com/v3/place/text?key=${AMAP_KEY}&keywords=${encodeURIComponent(keywords)}&city=${encodeURIComponent(city || '')}&citylimit=false&output=json`
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.status === '1' && data.pois) {
      res.json({ success: true, data: data.pois.slice(0, 10) })
    } else {
      res.json({ success: true, data: [], message: data.info || '未找到结果' })
    }
  } catch (err) {
    console.error('POI搜索失败:', err)
    res.status(500).json({ success: false, error: '搜索失败' })
  }
}

/**
 * 地理编码 - 地址转坐标
 */
async function geocode(req, res) {
  const { address, city } = req.query
  
  if (!address) {
    return res.status(400).json({ success: false, error: '请输入地址' })
  }

  if (!AMAP_KEY) {
    return res.json({ 
      success: true, 
      data: { location: '121.4737,31.2304', formatted_address: address }
    })
  }

  try {
    const url = `https://restapi.amap.com/v3/geocode/geo?key=${AMAP_KEY}&address=${encodeURIComponent(address)}&city=${encodeURIComponent(city || '')}`
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.status === '1' && data.geocodes?.[0]) {
      res.json({ success: true, data: data.geocodes[0] })
    } else {
      res.json({ success: false, error: data.info || '未找到地址' })
    }
  } catch (err) {
    console.error('地理编码失败:', err)
    res.status(500).json({ success: false, error: '地理编码失败' })
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

  if (!AMAP_KEY) {
    return res.json({ 
      success: true, 
      data: { formatted_address: '上海市浦东新区', city: '上海市' }
    })
  }

  try {
    const url = `https://restapi.amap.com/v3/geocode/regeo?key=${AMAP_KEY}&location=${location}`
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.status === '1' && data.regeocode) {
      const { formatted_address, addressComponent } = data.regeocode
      res.json({ 
        success: true, 
        data: { 
          formatted_address,
          city: addressComponent?.city || '',
          district: addressComponent?.district || '',
          province: addressComponent?.province || ''
        }
      })
    } else {
      res.json({ success: false, error: data.info || '未找到地址' })
    }
  } catch (err) {
    console.error('逆地理编码失败:', err)
    res.status(500).json({ success: false, error: '逆地理编码失败' })
  }
}

module.exports = {
  searchPOI,
  geocode,
  regeocode
}
