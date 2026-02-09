import { View, Image, Text, Map } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { Swiper, Button, Card, SearchBar, Tag, Space, Toast, CalendarPicker, Picker, Popup, Cascader } from 'antd-mobile'
import { SearchOutline, CalendarOutline, EnvironmentOutline } from 'antd-mobile-icons'
import { api } from '../../services/request'
import HotelCard from '../../components/HotelCard'
import { cityData } from '../../utils/cityData'
import './index.css'

// 轮播 Banner 数据
const bannerList = [
  { id: 1, title: '春日出游季', color: '#0086F6' },
  { id: 2, title: '会员专享折扣', color: '#00BFFF' },
  { id: 3, title: '亲子酒店推荐', color: '#FF8C00' },
]

// 快捷标签 - remove hardcoded
// const quickTags = ['亲子', '免费停车', '高评分', '近地铁', '含早餐', '海景房']

const formatDate = (date) => {
  if (!date || Number.isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const AMAP_KEY = 'ddced92dcf9226be15b73e95708224f9' // 请替换为您的高德地图 Key

export default function Index() {
  const [city, setCity] = useState('上海')
  const [keyword, setKeyword] = useState('')
  const [quickTags, setQuickTags] = useState([]) // Load from backend
  
  // Initialize with valid dates to prevent flash of empty/NaN content
  const [checkIn, setCheckIn] = useState(() => {
    const d = new Date()
    return formatDate(d)
  })
  const [checkOut, setCheckOut] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return formatDate(d)
  })

  const [calendarVisible, setCalendarVisible] = useState(false)
  const [filterVisible, setFilterVisible] = useState(false)
  const [selectedStar, setSelectedStar] = useState(null)
  const [selectedPrice, setSelectedPrice] = useState(null) // null, '0-150', '150-300', '300-450', '450-600', '600-1000', '1000+'
  const [hotHotels, setHotHotels] = useState([])
  const [latitude, setLatitude] = useState(31.2304) // Default Shanghai
  const [longitude, setLongitude] = useState(121.4737)
  const [mapVisible, setMapVisible] = useState(false)
  const [mapInstance, setMapInstance] = useState(null)
  const [markerInstance, setMarkerInstance] = useState(null)
  const [selectedAddress, setSelectedAddress] = useState('')
  const [cityPickerVisible, setCityPickerVisible] = useState(false)
  const [locationCity, setLocationCity] = useState('') // Store GPS location city separately
  // const [cityList, setCityList] = useState([]) // Deprecated in favor of static cityData for hierarchy

  useEffect(() => {
    fetchHotHotels()
    fetchQuickTags()
    // fetchCities() // No longer needed
  }, [])

  /*
  const fetchCities = async () => {
    try {
      const res = await api.get('/api/presets/cities')
      if (res && res.success && Array.isArray(res.data)) {
         // Format for Picker: [[{ label: 'Shanghai', value: 'Shanghai' }, ...]]
         const formatted = res.data.map(c => ({ label: c.name, value: c.name }))
         setCityList([formatted])
      }
    } catch (e) {
      console.error('Fetch cities failed', e)
    }
  }
  */

  const fetchQuickTags = async () => {
    try {
      // Fetch preset facilities as quick tags
      const res = await api.get('/api/presets/facilities')
      if (res && res.success && Array.isArray(res.data)) {
         // Filter or pick top 6-8 tags
         // Assuming data is [{name: 'WiFi', ...}, ...]
         const tags = res.data.slice(0, 8).map(item => item.name)
         setQuickTags(tags)
      } else {
         // Fallback
         setQuickTags(['亲子', '免费停车', '高评分', '近地铁', '含早餐', '海景房'])
      }
    } catch (e) {
      console.error('Fetch tags failed', e)
      setQuickTags(['亲子', '免费停车', '高评分', '近地铁', '含早餐', '海景房'])
    }
  }

  useEffect(() => {
    if (mapVisible && process.env.TARO_ENV === 'h5') {
      // H5 Amap Loader
      if (!window.AMap) {
        const script = document.createElement('script')
        script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}`
        script.onload = () => {
             initAmap()
        }
        script.onerror = () => {
             Toast.show({ content: '地图加载失败', icon: 'fail' })
        }
        document.body.appendChild(script)
      } else {
        initAmap()
      }
    }
  }, [mapVisible])

  const initAmap = () => {
    if (window.AMap) {
        const map = new window.AMap.Map('amap-container', {
            zoom: 14,
            center: [longitude, latitude],
        })
        const marker = new window.AMap.Marker({
            position: [longitude, latitude],
            title: '当前位置'
        })
        map.add(marker)
        setMapInstance(map)
        setMarkerInstance(marker)

        map.on('click', (e) => {
            const lng = e.lnglat.getLng()
            const lat = e.lnglat.getLat()
            marker.setPosition([lng, lat])
            setLongitude(lng)
            setLatitude(lat)
            handleReverseGeocode(lng, lat)
        })
    }
  }

  const handleReverseGeocode = async (lng, lat) => {
    try {
      const response = await api.get(`/api/map/regeocode?location=${lng},${lat}`)
      if (response && response.success && response.data) {
        const { addressComponent, formatted_address, city } = response.data
        let cityName = ''
        
        if (addressComponent) {
            cityName = addressComponent.city
            if (!cityName || typeof cityName !== 'string') {
                cityName = addressComponent.province
            }
        } else if (city) {
            // Fallback if backend returns flat structure
            cityName = city
        }
        
        setSelectedAddress(formatted_address || cityName)
        return cityName
      }
    } catch (error) {
      console.error('Reverse geocode error:', error)
      return null
    }
  }

  const handleConfirmLocation = async () => {
    // If user moved the map pin, we have updated lat/long
    // and potentially selectedAddress.
    // We should call reverse geocode if haven't, or just use the result.
    // Since we update on click, we just need to ensure we have the city name.
    
    // For simplicity, let's just trigger one last check or use what we have.
    // If user didn't click, latitude/longitude are original.
    
    try {
        const response = await api.get(`/api/map/regeocode?location=${longitude},${latitude}`)
        if (response && response.success && response.data) {
            const { addressComponent, city } = response.data
            let cityName = ''
            if (addressComponent) {
                cityName = addressComponent.city
                if (!cityName || typeof cityName !== 'string') {
                    cityName = addressComponent.province
                }
            } else if (city) {
                cityName = city
            }
            
            setCity(cityName || '未知')
            setMapVisible(false)
            Toast.show({ content: `已切换到 ${cityName}`, icon: 'success' })
        } else {
            setMapVisible(false)
        }
    } catch (e) {
        console.error('Confirm location error', e)
        setMapVisible(false)
    }
  }

  const handleNativeMapTap = (e) => {
      const { latitude: lat, longitude: lng } = e.detail
      setLatitude(lat)
      setLongitude(lng)
      handleReverseGeocode(lng, lat)
  }

  const addDays = (dateStr, days) => {
    const base = new Date(dateStr)
    if (Number.isNaN(base.getTime())) return dateStr
    base.setDate(base.getDate() + days)
    return formatDate(base)
  }

  // 日期选择逻辑待接入 antd-mobile Calendar 组件
  // 目前先保留点击交互，后续集成

  const fetchHotHotels = async () => {
    try {
      const data = await api.get('/api/hotels?pageSize=4')
      if (data && data.list) {
        setHotHotels(data.list)
      }
    } catch (err) {}
  }

  const handleLocation = () => {
    // Determine the type parameter based on environment
    // H5 only supports 'wgs84', while Weapp supports 'gcj02'
    const type = process.env.TARO_ENV === 'h5' ? 'wgs84' : 'gcj02'

    Taro.getLocation({
      type: type, 
      success: async function (res) {
        const { latitude, longitude } = res
        setLatitude(latitude)
        setLongitude(longitude)
        
        try {
          // Call backend to reverse geocode
          // Note: Backend expects location=lng,lat
          const response = await api.get(`/api/map/regeocode?location=${longitude},${latitude}`)
          if (response && response.success && response.data) {
            const { addressComponent, formatted_address, city } = response.data
            // Amap sometimes returns city as [] if it's a direct-controlled municipality like Shanghai?
            // Usually addressComponent.city is string, or province if city is empty.
            let cityName = ''
            if (addressComponent) {
                cityName = addressComponent.city
                if (!cityName || typeof cityName !== 'string') {
                    cityName = addressComponent.province
                }
            } else if (city) {
                cityName = city
            }
            // Remove '市' suffix for display if desired, but keep full name is also fine.
            const finalCity = cityName || '未知'
            setCity(finalCity)
            setLocationCity(finalCity) // Also update location city record
            Toast.show({ content: '定位成功', icon: 'success' })
          } else {
            Toast.show({ content: '获取位置信息失败', icon: 'fail' })
          }
        } catch (error) {
          console.error('Reverse geocode error:', error)
          Toast.show({ content: '定位服务异常', icon: 'fail' })
        }
      },
      fail: function (err) {
        console.error('Location failed:', err)
        // If H5 geolocation is blocked or fails (e.g. non-HTTPS), show friendly message
        if (process.env.TARO_ENV === 'h5' && window.location.protocol !== 'https:') {
             Toast.show({ content: 'H5定位需HTTPS环境', icon: 'fail' })
        } else {
             Toast.show({ content: '定位失败，请检查权限', icon: 'fail' })
        }
      }
    })
  }

  const handleSearch = () => {
    let url = `/pages/list/index?city=${encodeURIComponent(city)}&keyword=${encodeURIComponent(keyword)}&checkIn=${checkIn}&checkOut=${checkOut}`
    if (selectedStar) {
      url += `&stars=${selectedStar}`
    }
    if (selectedPrice) {
      // Pass price range as a query param. Backend needs to support range or specific logic.
      // Assuming list page can handle it or pass through.
      // Usually price range is minPrice=0&maxPrice=150
      // Let's decode simple range string here
      if (selectedPrice === '1000+') {
         url += `&minPrice=1000`
      } else {
         const [min, max] = selectedPrice.split('-')
         if (min) url += `&minPrice=${min}`
         if (max) url += `&maxPrice=${max}`
      }
    }
    Taro.navigateTo({ url })
  }

  const handleTagClick = (tag) => {
    let url = `/pages/list/index?city=${encodeURIComponent(city)}&keyword=${encodeURIComponent(tag)}&checkIn=${checkIn}&checkOut=${checkOut}`
    if (selectedStar) {
      url += `&stars=${selectedStar}`
    }
    if (selectedPrice) {
      if (selectedPrice === '1000+') {
         url += `&minPrice=1000`
      } else {
         const [min, max] = selectedPrice.split('-')
         if (min) url += `&minPrice=${min}`
         if (max) url += `&maxPrice=${max}`
      }
    }
    Taro.navigateTo({ url })
  }

  const handleHotelClick = (id) => {
    Taro.navigateTo({
      url: `/pages/detail/index?id=${id}&checkIn=${checkIn}&checkOut=${checkOut}`
    })
  }

  const handleBannerClick = (index) => {
    // 简单的跳转逻辑示例
    if (hotHotels.length > 0) {
       handleHotelClick(hotHotels[0].id)
    } else {
       handleSearch()
    }
  }

  const handleDateConfirm = (val) => {
    if (val && val[0] && val[1]) {
      setCheckIn(formatDate(val[0]))
      setCheckOut(formatDate(val[1]))
      setCalendarVisible(false)
    }
  }

  const nights = () => {
    if (!checkIn || !checkOut) return 1
    const d1 = new Date(checkIn)
    const d2 = new Date(checkOut)
    if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return 1
    const diff = (d2 - d1) / (1000 * 60 * 60 * 24)
    return Math.max(1, Math.round(diff))
  }

  return (
    <View className="index-page">
      {/* 沉浸式 Banner */}
      <View className="banner-container">
        <Swiper autoplay loop className="banner-swiper">
          {bannerList.map(item => (
            <Swiper.Item key={item.id}>
              <View 
                className="banner-item"
                onClick={() => handleBannerClick()}
                style={{ 
                  background: `linear-gradient(135deg, ${item.color} 0%, ${item.color}cc 100%)`
                }}
              >
                {item.title}
              </View>
            </Swiper.Item>
          ))}
        </Swiper>
      </View>

      {/* 携程风搜索卡片 */}
      <Card className="search-card">
        {/* 城市选择与地图入口 */}
        <View className="search-row">
           <View style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
             <View 
               style={{ display: 'flex', alignItems: 'center' }}
               onClick={() => setCityPickerVisible(true)}
             >
               <EnvironmentOutline style={{ marginRight: 4, color: '#0086F6', fontSize: 22 }} />
               <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#333' }}>{city}</Text>
             </View>
             <View 
                style={{ display: 'flex', alignItems: 'center', marginTop: 6, paddingLeft: 4 }}
                onClick={handleLocation}
              >
                <Tag color="primary" fill="outline" style={{ marginRight: 8, fontSize: 10 }}>
                  {city === locationCity && locationCity ? '当前位置' : '我的位置'}
                </Tag>
                <Text style={{ fontSize: 12, color: '#999' }}>
                  {locationCity && city !== locationCity ? `${locationCity} (点击切换)` : '点击刷新定位'}
                </Text>
              </View>
           </View>
           
           <View 
             onClick={() => setMapVisible(true)} 
             style={{ 
               display: 'flex', 
               flexDirection: 'column', 
               alignItems: 'center', 
               borderLeft: '1px solid #eee', 
               paddingLeft: 16, 
               marginLeft: 8 
             }}
           >
              <EnvironmentOutline style={{ fontSize: 24, color: '#0086F6' }} />
              <Text style={{ fontSize: 10, color: '#666', marginTop: 2 }}>地图模式</Text>
           </View>
        </View>

        {/* 日期选择 */}
        <View className="date-row" onClick={() => setCalendarVisible(true)}>
          <View>
             <View style={{ color: '#999', fontSize: 12 }}>入住</View>
             <View style={{ fontSize: 16, fontWeight: 'bold', marginTop: 4 }}>
                {checkIn.split('-')[1]}月{checkIn.split('-')[2]}日
             </View>
          </View>
          <View style={{ 
             background: '#f0f2f5', 
             padding: '2px 8px', 
             borderRadius: 10, 
             fontSize: 12, 
             color: '#333' 
          }}>
             {nights()}晚
          </View>
          <View style={{ textAlign: 'right' }}>
             <View style={{ color: '#999', fontSize: 12 }}>离店</View>
             <View style={{ fontSize: 16, fontWeight: 'bold', marginTop: 4 }}>
                {checkOut.split('-')[1]}月{checkOut.split('-')[2]}日
             </View>
          </View>
        </View>

        {/* 筛选条件（星级/价格） */}
        <View className="filter-group" style={{ display: 'flex', gap: 12, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #f5f5f5' }}>
          <View 
            className="filter-row" 
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f5f5f5', padding: '8px 12px', borderRadius: 4 }}
            onClick={() => setFilterVisible('price')}
          >
             <View style={{ color: '#333', fontSize: 14 }}>价格</View>
             <View style={{ color: selectedPrice ? '#0086F6' : '#999', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
               {selectedPrice ? `¥${selectedPrice}` : '不限'} &gt;
             </View>
          </View>

          <View 
            className="filter-row" 
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f5f5f5', padding: '8px 12px', borderRadius: 4 }}
            onClick={() => setFilterVisible('star')}
          >
             <View style={{ color: '#333', fontSize: 14 }}>星级</View>
             <View style={{ color: selectedStar ? '#0086F6' : '#999', fontSize: 12 }}>
               {selectedStar ? (selectedStar === '0' ? '未评级' : `${selectedStar}星级`) : '不限'} &gt;
             </View>
          </View>
        </View>

        {/* 关键字搜索 */}
        <View style={{ marginBottom: 20 }}>
          <SearchBar 
            placeholder="关键字/位置/品牌/酒店名" 
            value={keyword}
            onChange={val => setKeyword(val)}
            style={{ '--background': '#f5f5f5', borderRadius: 4 }}
          />
        </View>

        {/* 搜索按钮 */}
        <Button 
          block 
          color="primary" 
          size="large" 
          onClick={handleSearch}
          className="search-btn"
        >
          查询
        </Button>
      </Card>

      {/* 快捷标签 */}
      <View style={{ padding: '20px 16px 0' }}>
        <View style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>快捷筛选</View>
        <Space wrap>
          {quickTags.map((tag, idx) => (
            <Tag 
              key={idx} 
              fill="outline" 
              color="primary"
              onClick={() => handleTagClick(tag)}
              style={{ padding: '6px 12px', borderRadius: 4, background: '#e6f7ff', border: 'none', color: '#0086F6' }}
            >
              {tag}
            </Tag>
          ))}
        </Space>
      </View>

      {/* 热门酒店 */}
      {hotHotels.length > 0 && (
        <View style={{ padding: '20px 16px' }}>
          <View style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>热门推荐</View>
          <Space direction="vertical" block>
            {hotHotels.map(hotel => (
              <HotelCard 
                key={hotel.id} 
                hotel={hotel} 
                onClick={() => handleHotelClick(hotel.id)} 
              />
            ))}
          </Space>
        </View>
      )}

      {/* 城市选择弹窗 - 使用级联选择器 */}
      <Cascader
        options={cityData}
        visible={cityPickerVisible}
        onClose={() => setCityPickerVisible(false)}
        value={[]}
        onConfirm={v => {
          // v is array of values, e.g. ['江苏省', '南京市']
          // We usually want the last selected item as the city
          const selected = v[v.length - 1]
          if (selected) setCity(selected)
        }}
      />

      {/* 日期选择弹窗 */}
      <CalendarPicker
          selectionMode='range'
          visible={calendarVisible}
          onClose={() => setCalendarVisible(false)}
          onConfirm={handleDateConfirm}
          defaultValue={[new Date(checkIn), new Date(checkOut)]}
        />

      {/* 星级筛选弹窗 */}
      <Picker
        columns={[[
          { label: '不限', value: null },
          { label: '未评级', value: '0' },
          { label: '一星级', value: '1' },
          { label: '二星级', value: '2' },
          { label: '三星级', value: '3' },
          { label: '四星级', value: '4' },
          { label: '五星级', value: '5' },
        ]]}
        visible={filterVisible === 'star'}
        onClose={() => setFilterVisible(false)}
        value={[selectedStar]}
        onConfirm={v => {
          setSelectedStar(v[0])
        }}
      />

      {/* 价格筛选弹窗 */}
      <Picker
        columns={[[
          { label: '不限', value: null },
          { label: '¥150以下', value: '0-150' },
          { label: '¥150-300', value: '150-300' },
          { label: '¥300-450', value: '300-450' },
          { label: '¥450-600', value: '450-600' },
          { label: '¥600-1000', value: '600-1000' },
          { label: '¥1000以上', value: '1000+' },
        ]]}
        visible={filterVisible === 'price'}
        onClose={() => setFilterVisible(false)}
        value={[selectedPrice]}
        onConfirm={v => {
          setSelectedPrice(v[0])
        }}
      />

      {/* 地图找房弹窗 */}
      <Popup
        visible={mapVisible}
        onMaskClick={() => setMapVisible(false)}
        bodyStyle={{ height: '80vh', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}
      >
        <View style={{ height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <View style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', borderBottom: '1px solid #eee' }}>
            地图找房
          </View>
          <View style={{ flex: 1, position: 'relative' }}>
              {mapVisible && (
                process.env.TARO_ENV === 'h5' ? (
                  <View id="amap-container" style={{ width: '100%', height: '100%' }}>
                     {/* Amap will be rendered here */}
                     {!window.AMap && <View style={{ padding: 20, textAlign: 'center', color: '#999' }}>正在加载地图...</View>}
                  </View>
                ) : (
                  <Map
                    id="myMap"
                    longitude={longitude}
                    latitude={latitude}
                    scale={14}
                    show-location
                    onTap={handleNativeMapTap}
                    style={{ width: '100%', height: '100%' }}
                    markers={[{
                      id: 1,
                      longitude: longitude,
                      latitude: latitude,
                      title: '当前位置',
                      width: 30,
                      height: 30
                    }]}
                  />
                )
              )}
              {selectedAddress && (
                 <View style={{ position: 'absolute', top: 10, left: 10, right: 10, background: 'rgba(255,255,255,0.9)', padding: 8, borderRadius: 8, zIndex: 999 }}>
                    <Text style={{ fontSize: 12, color: '#333' }}>当前选择: {selectedAddress}</Text>
                 </View>
              )}
           </View>
           <View style={{ padding: '12px' }}>
              <Button block color='primary' onClick={handleConfirmLocation}>
                确认位置并同步
              </Button>
           </View>
        </View>
      </Popup>
    </View>
  )
}
