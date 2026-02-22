import { View, Image, Text, Map } from '@tarojs/components'
import Taro, { useReachBottom } from '@tarojs/taro'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Swiper, Button, Card, SearchBar, Tag, Space, Toast, CalendarPicker, Picker, Popup, Cascader, Slider } from 'antd-mobile'
import { SearchOutline, CalendarOutline, EnvironmentOutline } from 'antd-mobile-icons'
import { api } from '../../services/request'
import { cityData } from '../../utils/cityData'
import { formatDate, getCalendarBounds, parseLocalDate, resolveDateRange } from '../../utils/dateRange'
import './index.css'

// 轮播 Banner 数据
const bannerList = [
  { id: 1, title: '春日出游季', color: '#0086F6' },
  { id: 2, title: '会员专享折扣', color: '#00BFFF' },
  { id: 3, title: '亲子酒店推荐', color: '#FF8C00' },
]

// 快捷标签 - remove hardcoded
// const quickTags = ['亲子', '免费停车', '高评分', '近地铁', '含早餐', '海景房']

const AMAP_KEY = 'ddced92dcf9226be15b73e95708224f9' // 请替换为您的高德地图 Key

export default function Index() {
  const SEARCH_STORAGE_KEY = 'hotel_search_params'
  const storedParams = Taro.getStorageSync(SEARCH_STORAGE_KEY) || {}
  const initialDateRange = resolveDateRange({
    checkIn: storedParams.checkIn,
    checkOut: storedParams.checkOut
  })
  const [city, setCity] = useState(() => storedParams.city || '上海')
  const [keyword, setKeyword] = useState(() => storedParams.keyword || '')
  const [quickTags, setQuickTags] = useState([]) // Load from backend
  
  // 初始化时统一按本地时区修正，避免 YYYY-MM-DD 在非东八区被解析成前一天
  const [checkIn, setCheckIn] = useState(() => initialDateRange.checkIn)
  const [checkOut, setCheckOut] = useState(() => initialDateRange.checkOut)
  const calendarBounds = useMemo(() => getCalendarBounds(), [])

  const [calendarVisible, setCalendarVisible] = useState(false)
  const [filterVisible, setFilterVisible] = useState(false)
  const [selectedStar, setSelectedStar] = useState(() => storedParams.selectedStar ?? null)
  const [selectedPrice, setSelectedPrice] = useState(() => storedParams.selectedPrice ?? null) // null, '0-150', '150-300', ...
  const [priceRange, setPriceRange] = useState([0, 2100]) // For slider state
  const [hotHotels, setHotHotels] = useState([])
  const [hotLoading, setHotLoading] = useState(false)
  const [hotHasMore, setHotHasMore] = useState(true)
  const [hotPage, setHotPage] = useState(1)
  const hotPageSize = 6
  const hotLoadingRef = useRef(false)
  const hotHasMoreRef = useRef(true)
  const hotPageRef = useRef(1)
  const hotFallbackImageHeight = 140
  const [hotCardWidth, setHotCardWidth] = useState(0)
  const [hotImageRatios, setHotImageRatios] = useState({})
  const [latitude, setLatitude] = useState(() => Number(storedParams.userLat) || 31.2304) // Default Shanghai
  const [longitude, setLongitude] = useState(() => Number(storedParams.userLng) || 121.4737)
  const [mapVisible, setMapVisible] = useState(false)
  const [mapInstance, setMapInstance] = useState(null)
  const [markerInstance, setMarkerInstance] = useState(null)
  const [selectedAddress, setSelectedAddress] = useState('')
  const [cityPickerVisible, setCityPickerVisible] = useState(false)
  const [locationCity, setLocationCity] = useState('') // Store GPS location city separately
  // const [cityList, setCityList] = useState([]) // Deprecated in favor of static cityData for hierarchy
  const hotColumns = hotHotels.reduce((cols, hotel, index) => {
    const next = cols
    next[index % 2].push(hotel)
    return next
  }, [[], []])

  useEffect(() => {
    fetchHotHotels(1)
    fetchQuickTags()
    // fetchCities() // No longer needed
  }, [])

  useEffect(() => {
    Taro.setStorageSync(SEARCH_STORAGE_KEY, {
      city,
      keyword,
      checkIn,
      checkOut,
      selectedStar,
      selectedPrice,
      userLat: latitude,
      userLng: longitude
    })
  }, [city, keyword, checkIn, checkOut, selectedStar, selectedPrice, latitude, longitude])

  useEffect(() => {
    if (filterVisible === 'price') {
      if (selectedPrice) {
        if (selectedPrice.endsWith('+')) {
          const min = parseInt(selectedPrice)
          setPriceRange([min, 2100])
        } else if (selectedPrice.includes('-')) {
          const [min, max] = selectedPrice.split('-').map(Number)
          setPriceRange([min, max])
        } else {
          setPriceRange([0, 2100])
        }
      } else {
        setPriceRange([0, 2100])
      }
    }
  }, [filterVisible])

  useEffect(() => {
    hotLoadingRef.current = hotLoading
  }, [hotLoading])

  useEffect(() => {
    hotHasMoreRef.current = hotHasMore
  }, [hotHasMore])

  useEffect(() => {
    hotPageRef.current = hotPage
  }, [hotPage])

  useEffect(() => {
    if (!hotHotels.length) return
    const updateWidth = () => {
      Taro.nextTick(() => {
        const query = Taro.createSelectorQuery()
        query.select('.hot-column').boundingClientRect((rect) => {
          if (rect?.width && rect.width !== hotCardWidth) {
            setHotCardWidth(rect.width)
          }
        }).exec()
      })
    }
    const resizeHandler = () => {
      updateWidth()
    }
    updateWidth()
    if (Taro.onWindowResize) {
      Taro.onWindowResize(resizeHandler)
    }
    return () => {
      if (Taro.offWindowResize) {
        Taro.offWindowResize(resizeHandler)
      }
    }
  }, [hotHotels.length, hotCardWidth])

  const resolveHotImageHeight = (id) => {
    if (!hotCardWidth) return hotFallbackImageHeight
    const ratio = hotImageRatios[id]
    if (ratio) return Math.round(hotCardWidth * ratio)
    return hotFallbackImageHeight
  }

  const handleHotImageLoad = (id) => (e) => {
    const width = e?.detail?.width
    const height = e?.detail?.height
    if (!width || !height) return
    const ratio = height / width
    setHotImageRatios(prev => (prev[id] === ratio ? prev : { ...prev, [id]: ratio }))
  }

  const handleHotImageError = (id) => () => {
    if (!hotCardWidth) return
    const ratio = hotFallbackImageHeight / hotCardWidth
    setHotImageRatios(prev => (prev[id] === ratio ? prev : { ...prev, [id]: ratio }))
  }

  const handlePriceConfirm = () => {
    const [min, max] = priceRange
    if (min === 0 && max === 2100) {
      setSelectedPrice(null)
    } else if (max === 2100) {
      setSelectedPrice(`${min}+`)
    } else {
      setSelectedPrice(`${min}-${max}`)
    }
    setFilterVisible(false)
  }

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
        // 检查是否已经存在 script 标签，避免重复加载
        if (document.querySelector('script[src*="webapi.amap.com/maps"]')) {
           // 如果 script 存在但 AMap 未就绪，等待一下（简单轮询）
           const checkAMap = setInterval(() => {
             if (window.AMap) {
               clearInterval(checkAMap)
               initAmap()
             }
           }, 100)
           // 5秒超时
           setTimeout(() => clearInterval(checkAMap), 5000)
           return
        }

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
            zoom: 4, // 调整缩放级别以显示全国
            center: [105.0, 35.0], // 中国地理中心坐标
        })
        const marker = new window.AMap.Marker({
            position: [longitude, latitude],
            title: '当前位置'
        })
        // 初始不显示 marker，只有点击或定位后才显示
        // map.add(marker)
        setMapInstance(map)
        setMarkerInstance(marker)

        map.on('click', (e) => {
            const lng = e.lnglat.getLng()
            const lat = e.lnglat.getLat()
            marker.setPosition([lng, lat])
            // 确保 marker 在地图上
            if (!marker.getMap()) {
                map.add(marker)
            }
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

  // 日期选择逻辑待接入 antd-mobile Calendar 组件
  // 目前先保留点击交互，后续集成

  const fetchHotHotels = async (nextPage = 1) => {
    if (hotLoadingRef.current) return
    setHotLoading(true)
    try {
      const data = await api.get(`/api/hotels?page=${nextPage}&pageSize=${hotPageSize}`)
      if (data && data.list) {
        setHotHotels(prev => (nextPage === 1 ? data.list : [...prev, ...data.list]))
        const nextHasMore = data.list.length >= hotPageSize
        setHotHasMore(nextHasMore)
        setHotPage(nextPage)
      } else {
        setHotHasMore(false)
      }
    } catch (err) {
      setHotHasMore(false)
    } finally {
      setHotLoading(false)
    }
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
    let url = `/pages/list/index?city=${encodeURIComponent(city)}&keyword=${encodeURIComponent(keyword)}&checkIn=${checkIn}&checkOut=${checkOut}&userLat=${latitude}&userLng=${longitude}`
    if (selectedStar) {
      url += `&stars=${selectedStar}`
    }
    if (selectedPrice) {
      if (selectedPrice.endsWith('+')) {
         const min = selectedPrice.replace('+', '')
         url += `&minPrice=${min}`
      } else {
         const [min, max] = selectedPrice.split('-')
         if (min) url += `&minPrice=${min}`
         if (max) url += `&maxPrice=${max}`
      }
    }
    Taro.navigateTo({ url })
  }

  const handleTagClick = (tag) => {
    let url = `/pages/list/index?city=${encodeURIComponent(city)}&keyword=&tags=${encodeURIComponent(tag)}&checkIn=${checkIn}&checkOut=${checkOut}&userLat=${latitude}&userLng=${longitude}`
    if (selectedStar) {
      url += `&stars=${selectedStar}`
    }
    if (selectedPrice) {
      if (selectedPrice.endsWith('+')) {
         const min = selectedPrice.replace('+', '')
         url += `&minPrice=${min}`
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

  useReachBottom(() => {
    if (hotLoadingRef.current || !hotHasMoreRef.current) return
    fetchHotHotels(hotPageRef.current + 1)
  })

  const nights = () => {
    if (!checkIn || !checkOut) return 1
    const d1 = parseLocalDate(checkIn)
    const d2 = parseLocalDate(checkOut)
    if (!d1 || !d2) return 1
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
        <View className="hot-section">
          <View className="hot-title">热门推荐</View>
          <View className="hot-waterfall">
            {hotColumns.map((column, columnIndex) => (
              <View key={`hot-col-${columnIndex}`} className="hot-column">
                {column.map((hotel) => {
                  const imageSrc = (Array.isArray(hotel.images) && hotel.images[0]) || hotel.cover_image || ''
                  const hotelName = hotel?.name || hotel?.name_en || `酒店 #${hotel?.id ?? '--'}`
                  const starCount = Math.max(0, Math.min(5, Number(hotel?.star_rating) || 0))
                  const lowestPrice = hotel?.lowestPrice

                  return (
                    <View
                      key={hotel.id}
                      className="hot-card"
                      onClick={() => handleHotelClick(hotel.id)}
                    >
                      {imageSrc ? (
                        <Image
                          className="hot-card-image"
                          src={imageSrc}
                          mode="widthFix"
                          style={{ height: `${resolveHotImageHeight(hotel.id)}px` }}
                          onLoad={handleHotImageLoad(hotel.id)}
                          onError={handleHotImageError(hotel.id)}
                        />
                      ) : (
                        <View className="hot-card-image-placeholder">
                          <Text className="hot-card-image-placeholder-text">暂无图片</Text>
                        </View>
                      )}
                      <View className="hot-card-body">
                        <View className="hot-card-name-row">
                          <Text className="hot-card-name">{hotelName}</Text>
                          {starCount > 0 ? (
                            <View className="hot-card-stars">
                              {Array.from({ length: starCount }).map((_, idx) => (
                                <Text key={`${hotel.id}-star-${idx}`} className="hot-card-star">★</Text>
                              ))}
                            </View>
                          ) : null}
                        </View>
                        <View className="hot-card-price">
                          {lowestPrice ? (
                            <>
                              <Text className="hot-card-price-symbol">¥</Text>
                              <Text className="hot-card-price-value">{lowestPrice}</Text>
                              <Text className="hot-card-price-suffix">起</Text>
                            </>
                          ) : (
                            <Text className="hot-card-price-empty">暂无房型</Text>
                          )}
                        </View>
                      </View>
                    </View>
                  )
                })}
              </View>
            ))}
          </View>
          <View className="hot-load">
            <Text className="hot-load-text">
              {hotLoading ? '正在加载更多酒店...' : (hotHasMore ? '上拉加载更多酒店' : '已全部加载完成')}
            </Text>
          </View>
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
          min={calendarBounds.min}
          max={calendarBounds.max}
          defaultValue={[parseLocalDate(checkIn), parseLocalDate(checkOut)]}
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
      <Popup
        visible={filterVisible === 'price'}
        onMaskClick={() => setFilterVisible(false)}
        bodyStyle={{ borderTopLeftRadius: '12px', borderTopRightRadius: '12px', background: '#fff', minHeight: '40vh' }}
      >
        <View style={{ padding: '16px' }}>
          <View style={{ textAlign: 'center', fontSize: 16, fontWeight: 'bold', marginBottom: 24 }}>价格筛选</View>
          
          <View style={{ marginBottom: 32, padding: '0 12px' }}>
             <View style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, color: '#333', fontSize: 14 }}>
               <Text>¥{priceRange[0]}</Text>
               <Text>¥{priceRange[1] === 2100 ? '2100+' : priceRange[1]}</Text>
             </View>
             <Slider
               range
               min={0}
               max={2100}
               step={50}
               value={priceRange}
               onChange={val => setPriceRange(val)}
               style={{ '--fill-color': '#0086F6' }}
             />
          </View>

          <View style={{ marginBottom: 24 }}>
             <View style={{ fontSize: 14, color: '#999', marginBottom: 12 }}>价格区间</View>
             <Space wrap style={{ '--gap': '12px' }}>
               {[
                 { label: '不限', value: null },
                 { label: '¥150以下', value: '0-150' },
                 { label: '¥150-300', value: '150-300' },
                 { label: '¥300-450', value: '300-450' },
                 { label: '¥450-600', value: '450-600' },
                 { label: '¥600-1000', value: '600-1000' },
                 { label: '¥1000以上', value: '1000+' },
               ].map(item => {
                 let isActive = false
                 if (item.value === null) isActive = priceRange[0] === 0 && priceRange[1] === 2100
                 else if (item.value.endsWith('+')) isActive = priceRange[0] === parseInt(item.value) && priceRange[1] === 2100
                 else {
                    const [min, max] = item.value.split('-').map(Number)
                    isActive = priceRange[0] === min && priceRange[1] === max
                 }
                 
                 return (
                   <Tag
                     key={item.label}
                     fill={isActive ? 'solid' : 'outline'}
                     color='primary'
                     style={{ 
                       padding: '6px 16px', 
                       borderRadius: 4, 
                       minWidth: 80, 
                       textAlign: 'center',
                       backgroundColor: isActive ? '#0086F6' : '#f5f5f5',
                       color: isActive ? '#fff' : '#333',
                       border: 'none'
                     }}
                     onClick={() => {
                        if (item.value === null) setPriceRange([0, 2100])
                        else if (item.value.endsWith('+')) setPriceRange([parseInt(item.value), 2100])
                        else {
                          const [min, max] = item.value.split('-').map(Number)
                          setPriceRange([min, max])
                        }
                     }}
                   >
                     {item.label}
                   </Tag>
                 )
               })}
             </Space>
          </View>

          <View style={{ display: 'flex', gap: 12 }}>
             <Button block shape='rounded' onClick={() => setPriceRange([0, 2100])} style={{ flex: 1, background: '#f5f5f5', border: 'none', color: '#666' }}>重置</Button>
             <Button block shape='rounded' color='primary' onClick={handlePriceConfirm} style={{ flex: 1 }}>查看酒店</Button>
          </View>
        </View>
      </Popup>

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
