import { View, Text, Image, Swiper, SwiperItem, Input, Picker } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { api } from '../../services/request'
import './index.css'

// 轮播 Banner 数据
const bannerList = [
  { id: 1, title: '春日出游季', color: '#1677ff' },
  { id: 2, title: '会员专享折扣', color: '#52c41a' },
  { id: 3, title: '亲子酒店推荐', color: '#fa8c16' },
]

// 快捷标签
const quickTags = ['亲子', '免费停车', '高评分', '近地铁', '含早餐', '海景房']

export default function Index() {
  const [city, setCity] = useState('上海')
  const [keyword, setKeyword] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [hotHotels, setHotHotels] = useState([])

  // 初始化日期
  useEffect(() => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    setCheckIn(formatDate(today))
    setCheckOut(formatDate(tomorrow))
    fetchHotHotels()
  }, [])

  const formatDate = (date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const addDays = (dateStr, days) => {
    const base = new Date(dateStr)
    if (Number.isNaN(base.getTime())) return dateStr
    base.setDate(base.getDate() + days)
    return formatDate(base)
  }

  const handleCheckInChange = (e) => {
    const value = e.detail.value
    setCheckIn(value)
    if (checkOut && new Date(checkOut) <= new Date(value)) {
      setCheckOut(addDays(value, 1))
    }
  }

  const handleCheckOutChange = (e) => {
    const value = e.detail.value
    if (checkIn && new Date(value) <= new Date(checkIn)) {
      setCheckOut(addDays(checkIn, 1))
      return
    }
    setCheckOut(value)
  }

  const fetchHotHotels = async () => {
    try {
      const data = await api.get('/api/hotels?pageSize=4')
      if (data && data.list) {
        setHotHotels(data.list)
      }
    } catch (err) {}
  }

  const handleSearch = () => {
    Taro.navigateTo({
      url: `/pages/list/index?city=${city}&keyword=${keyword}&checkIn=${checkIn}&checkOut=${checkOut}`
    })
  }

  const handleTagClick = (tag) => {
    Taro.navigateTo({
      url: `/pages/list/index?city=${city}&keyword=${tag}&checkIn=${checkIn}&checkOut=${checkOut}`
    })
  }

  const handleHotelClick = (id) => {
    Taro.navigateTo({
      url: `/pages/detail/index?id=${id}&checkIn=${checkIn}&checkOut=${checkOut}`
    })
  }

  const handleBannerClick = () => {
    if (!hotHotels.length) {
      handleSearch()
      return
    }
    handleHotelClick(hotHotels[0].id)
  }

  const nights = () => {
    if (!checkIn || !checkOut) return 1
    const diff = (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
    return Math.max(1, diff)
  }

  return (
    <View className="index-page">
      {/* 轮播 Banner */}
      <Swiper className="banner-swiper" autoplay circular indicatorDots indicatorColor="rgba(255,255,255,0.5)" indicatorActiveColor="#fff">
        {bannerList.map(item => (
          <SwiperItem key={item.id}>
            <View className="banner-item" onClick={handleBannerClick} style={{ background: `linear-gradient(135deg, ${item.color} 0%, ${item.color}99 100%)` }}>
              <Text className="banner-title">{item.title}</Text>
            </View>
          </SwiperItem>
        ))}
      </Swiper>

      {/* 搜索卡片 */}
      <View className="search-card glass-card">
        <View className="search-row">
          <Text className="search-label">城市</Text>
          <Input
            className="search-input"
            placeholder="请输入城市"
            value={city}
            onInput={(e) => setCity(e.detail.value)}
          />
        </View>
        <View className="search-row">
          <Text className="search-label">关键词</Text>
          <Input
            className="search-input"
            placeholder="酒店名/商圈/地标"
            value={keyword}
            onInput={(e) => setKeyword(e.detail.value)}
          />
        </View>
        <View className="date-row">
          <Picker mode="date" value={checkIn} onChange={handleCheckInChange}>
            <View className="date-item">
              <Text className="date-label">入住</Text>
              <Text className="date-value">{checkIn}</Text>
            </View>
          </Picker>
          <View className="date-nights">
            <Text className="nights-num">{nights()}</Text>
            <Text className="nights-text">晚</Text>
          </View>
          <Picker mode="date" value={checkOut} onChange={handleCheckOutChange}>
            <View className="date-item">
              <Text className="date-label">离店</Text>
              <Text className="date-value">{checkOut}</Text>
            </View>
          </Picker>
        </View>
        <View className="search-btn" onClick={handleSearch}>
          搜索酒店
        </View>
      </View>

      {/* 快捷标签 */}
      <View className="quick-section">
        <Text className="section-title">快捷筛选</Text>
        <View className="quick-tags">
          {quickTags.map((tag, idx) => (
            <View key={idx} className="quick-tag" onClick={() => handleTagClick(tag)}>
              {tag}
            </View>
          ))}
        </View>
      </View>

      {/* 热门酒店 */}
      {hotHotels.length > 0 && (
        <View className="hot-section">
          <Text className="section-title">热门推荐</Text>
          <View className="hot-list">
            {hotHotels.map(hotel => (
              <View key={hotel.id} className="hot-card glass-card" onClick={() => handleHotelClick(hotel.id)}>
                {hotel.images && hotel.images[0] ? (
                  <Image className="hot-img" src={hotel.images[0]} mode="aspectFill" />
                ) : (
                  <View className="hot-img-placeholder" />
                )}
                <View className="hot-info">
                  <Text className="hot-name">{hotel.name}</Text>
                  <Text className="hot-city">{hotel.city}</Text>
                  {hotel.lowestPrice && (
                    <Text className="hot-price">¥{hotel.lowestPrice}起</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  )
}
