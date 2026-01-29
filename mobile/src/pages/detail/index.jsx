import { View, Text, Image, ScrollView, Swiper, SwiperItem } from '@tarojs/components'
import { useRouter } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import './index.css'

const API_BASE = 'http://127.0.0.1:4100'

// 默认房型（后端暂未提供时使用）
const defaultRoomTypes = [
  { id: 1, name: '标准双床房', price: 299, breakfast: false, cancelable: true },
  { id: 2, name: '豪华大床房', price: 399, breakfast: true, cancelable: true },
  { id: 3, name: '行政套房', price: 599, breakfast: true, cancelable: false }
]

// 默认设施
const defaultFacilities = ['免费WiFi', '停车场', '健身房', '餐厅', '会议室', '洗衣服务']

export default function Detail() {
  const router = useRouter()
  const { id, checkIn, checkOut } = router.params

  const [hotel, setHotel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [navOpacity, setNavOpacity] = useState(0)

  useEffect(() => {
    fetchHotelDetail()
  }, [id])

  const fetchHotelDetail = async () => {
    try {
      setLoading(true)
      const res = await Taro.request({
        url: `${API_BASE}/api/hotels/${id}`,
        method: 'GET'
      })
      if (res.statusCode === 200 && res.data) {
        setHotel(res.data)
      }
    } catch (err) {
      console.error('获取酒店详情失败:', err)
      Taro.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const handleScroll = (e) => {
    const scrollTop = e.detail.scrollTop
    // 滚动 100px 内渐变显示导航栏背景
    const opacity = Math.min(scrollTop / 100, 1)
    setNavOpacity(opacity)
  }

  const handleBack = () => {
    Taro.navigateBack()
  }

  const handleBook = (room) => {
    Taro.showToast({ title: `预订${room.name}`, icon: 'none' })
    // TODO: 跳转到预订页面
  }

  const handleShare = () => {
    Taro.showToast({ title: '分享功能开发中', icon: 'none' })
  }

  const handleCollect = () => {
    Taro.showToast({ title: '收藏成功', icon: 'success' })
  }

  if (loading) {
    return (
      <View className="detail-page">
        <View className="loading-container">
          <Text className="loading-text">加载中...</Text>
        </View>
      </View>
    )
  }

  if (!hotel) {
    return (
      <View className="detail-page">
        <View className="error-container">
          <Text className="error-text">酒店信息不存在</Text>
        </View>
      </View>
    )
  }

  const images = hotel.images?.length > 0 
    ? hotel.images 
    : [hotel.cover_image || null]
  
  const facilities = hotel.facilities?.length > 0 
    ? hotel.facilities 
    : defaultFacilities
  
  const roomTypes = hotel.room_types?.length > 0 
    ? hotel.room_types 
    : defaultRoomTypes

  return (
    <View className="detail-page">
      {/* 透明渐变导航栏 */}
      <View className="nav-bar" style={{ background: `rgba(255,255,255,${navOpacity})` }}>
        <View className="nav-back" onClick={handleBack}>
          <Text className="nav-icon">←</Text>
        </View>
        <Text className="nav-title" style={{ opacity: navOpacity }}>{hotel.name}</Text>
        <View className="nav-actions">
          <View className="nav-btn" onClick={handleShare}>
            <Text className="nav-icon">↗</Text>
          </View>
          <View className="nav-btn" onClick={handleCollect}>
            <Text className="nav-icon">♡</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        className="detail-scroll" 
        scrollY 
        onScroll={handleScroll}
        scrollWithAnimation
      >
        {/* 轮播图 */}
        <View className="banner-section">
          <Swiper className="banner-swiper" indicatorDots indicatorColor="rgba(255,255,255,0.5)" indicatorActiveColor="#fff">
            {images.map((img, idx) => (
              <SwiperItem key={idx}>
                {img ? (
                  <Image className="banner-img" src={img} mode="aspectFill" />
                ) : (
                  <View className="banner-placeholder">
                    <Text className="placeholder-text">暂无图片</Text>
                  </View>
                )}
              </SwiperItem>
            ))}
          </Swiper>
          <View className="banner-count">{images.length} 张</View>
        </View>

        {/* 酒店基本信息 */}
        <View className="hotel-info glass-card">
          <View className="info-header">
            <Text className="hotel-name">{hotel.name}</Text>
            <View className="hotel-star">
              <Text className="star-icon">★</Text>
              <Text className="star-text">{hotel.star_rating || 4}星</Text>
            </View>
          </View>
          {hotel.name_en && <Text className="hotel-name-en">{hotel.name_en}</Text>}
          
          <View className="hotel-location">
            <Text className="location-icon">📍</Text>
            <Text className="location-text">{hotel.city} {hotel.address}</Text>
          </View>

          {hotel.opening_year && (
            <Text className="hotel-meta">{hotel.opening_year}年开业 · 装修时间</Text>
          )}

          {/* 标签 */}
          <View className="hotel-tags">
            {facilities.slice(0, 4).map((f, idx) => (
              <Text key={idx} className="hotel-tag">{f}</Text>
            ))}
          </View>

          {/* 评分 */}
          <View className="hotel-rating">
            <Text className="rating-score">{hotel.rating || '4.8'}</Text>
            <Text className="rating-label">超棒</Text>
            <Text className="rating-count">({hotel.review_count || 128}条点评)</Text>
          </View>
        </View>

        {/* 促销信息 */}
        {hotel.promotions?.length > 0 && (
          <View className="promo-section glass-card">
            <Text className="section-title">优惠活动</Text>
            {hotel.promotions.map((promo, idx) => (
              <View key={idx} className="promo-item">
                <Text className="promo-tag">惠</Text>
                <Text className="promo-text">{promo}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 入住信息 */}
        <View className="checkin-section glass-card">
          <View className="checkin-dates">
            <View className="date-item">
              <Text className="date-label">入住</Text>
              <Text className="date-value">{checkIn || '选择日期'}</Text>
            </View>
            <View className="date-divider">
              <Text className="nights-text">1晚</Text>
            </View>
            <View className="date-item">
              <Text className="date-label">离店</Text>
              <Text className="date-value">{checkOut || '选择日期'}</Text>
            </View>
          </View>
        </View>

        {/* 房型列表 */}
        <View className="room-section">
          <Text className="section-title">房型选择</Text>
          {roomTypes.map((room) => (
            <View key={room.id} className="room-card glass-card">
              <View className="room-img-wrap">
                <View className="room-img-placeholder"></View>
              </View>
              <View className="room-info">
                <Text className="room-name">{room.name}</Text>
                <View className="room-tags">
                  {room.breakfast && <Text className="room-tag green">含早</Text>}
                  {room.cancelable && <Text className="room-tag blue">免费取消</Text>}
                </View>
                <View className="room-detail">
                  <Text className="room-size">25㎡ · 大床1.8m</Text>
                </View>
              </View>
              <View className="room-right">
                <View className="room-price">
                  <Text className="price-symbol">¥</Text>
                  <Text className="price-num">{room.price}</Text>
                </View>
                <View className="book-btn" onClick={() => handleBook(room)}>
                  <Text className="book-text">预订</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* 设施服务 */}
        <View className="facility-section glass-card">
          <Text className="section-title">设施服务</Text>
          <View className="facility-grid">
            {facilities.map((f, idx) => (
              <View key={idx} className="facility-item">
                <Text className="facility-icon">✓</Text>
                <Text className="facility-name">{f}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 酒店政策 */}
        <View className="policy-section glass-card">
          <Text className="section-title">酒店政策</Text>
          <View className="policy-item">
            <Text className="policy-label">入住时间</Text>
            <Text className="policy-value">14:00后</Text>
          </View>
          <View className="policy-item">
            <Text className="policy-label">离店时间</Text>
            <Text className="policy-value">12:00前</Text>
          </View>
          <View className="policy-item">
            <Text className="policy-label">儿童政策</Text>
            <Text className="policy-value">欢迎儿童入住</Text>
          </View>
        </View>

        {/* 底部占位 */}
        <View className="bottom-placeholder"></View>
      </ScrollView>

      {/* 底部预订栏 */}
      <View className="bottom-bar glass-card">
        <View className="bottom-left">
          <View className="bottom-action" onClick={handleCollect}>
            <Text className="action-icon">♡</Text>
            <Text className="action-text">收藏</Text>
          </View>
          <View className="bottom-action">
            <Text className="action-icon">💬</Text>
            <Text className="action-text">咨询</Text>
          </View>
        </View>
        <View className="bottom-right">
          <View className="price-info">
            <Text className="price-from">¥</Text>
            <Text className="price-value">{hotel.price || roomTypes[0]?.price || 299}</Text>
            <Text className="price-suffix">起</Text>
          </View>
          <View className="main-book-btn" onClick={() => handleBook(roomTypes[0])}>
            <Text className="main-book-text">立即预订</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
