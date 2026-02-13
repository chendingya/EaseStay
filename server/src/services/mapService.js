const AMAP_KEY = process.env.AMAP_KEY || ''

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

module.exports = {
  geocode,
  regeocode,
  searchPOI
}
