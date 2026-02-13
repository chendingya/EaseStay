import { View, Text, Image, ScrollView, Swiper, SwiperItem } from '@tarojs/components'
import { useRouter } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { api } from '../../services/request'
import { isFavoriteHotel, toggleFavoriteHotel } from '../../services/favorites'
import PageTopBar from '../../components/PageTopBar'
import GlassButton from '../../components/GlassButton'
import { SendOutline, HeartOutline, HeartFill, MessageOutline } from 'antd-mobile-icons'
import './index.css'

// 默认设施
const defaultFacilities = ['免费WiFi', '停车场', '健身房', '餐厅', '会议室', '洗衣服务']

const formatPeriodLabel = (periods) => {
  const list = Array.isArray(periods) ? periods : []
  if (!list.length) return '长期'
  return list.map((p) => {
    const start = p && p.start ? new Date(p.start) : null
    const end = p && p.end ? new Date(p.end) : null
    if (!start || !end) return ''
    const pad = (n) => String(n).padStart(2, '0')
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    return `${fmt(start)}~${fmt(end)}`
  }).filter(Boolean).join('，')
}

const isEffectiveNow = (periods) => {
  const list = Array.isArray(periods) ? periods : []
  if (!list.length) return true
  const now = Date.now()
  return list.some((p) => {
    const start = p && p.start ? new Date(p.start).getTime() : null
    const end = p && p.end ? new Date(p.end).getTime() : null
    if (!start || !end) return false
    return now >= start && now <= end
  })
}

export default function Detail() {
  const router = useRouter()
  const { id, checkIn, checkOut } = router.params

  const [hotel, setHotel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [navOpacity, setNavOpacity] = useState(0)
  const [bookingRoomId, setBookingRoomId] = useState(null)
  const [collected, setCollected] = useState(false)
  const [bannerImageError, setBannerImageError] = useState({})
  const [roomImageError, setRoomImageError] = useState({})

  useEffect(() => {
    fetchHotelDetail()
  }, [id])

  useEffect(() => {
    const loadFavoriteStatus = async () => {
      try {
        const next = await isFavoriteHotel(id)
        setCollected(next)
      } catch (error) {
        setCollected(false)
      }
    }
    loadFavoriteStatus()
  }, [id])

  useEffect(() => {
    setBannerImageError({})
    setRoomImageError({})
  }, [id])

  const fetchHotelDetail = async () => {
    try {
      setLoading(true)
      const data = await api.get(`/api/hotels/${id}`)
      if (data) {
        setHotel(data)
      }
    } catch (err) {} finally {
      setLoading(false)
    }
  }

  const handleScroll = (e) => {
    const scrollTop = e.detail.scrollTop
    // 滚动 100px 内渐变显示导航栏背景
    const opacity = Math.min(scrollTop / 100, 1)
    setNavOpacity(opacity)
  }

  const handleBook = async (room) => {
    if (!room || bookingRoomId) return
    const token = Taro.getStorageSync('token')
    if (!token) {
      Taro.showToast({ title: '请先登录后下单', icon: 'none' })
      Taro.navigateTo({ url: '/pages/login/index' })
      return
    }
    if (!checkIn || !checkOut) {
      Taro.showToast({ title: '请先选择入住和离店日期', icon: 'none' })
      return
    }
    setBookingRoomId(room.id)
    try {
      const order = await api.post(`/api/hotels/${id}/orders`, {
        roomTypeId: room.id,
        quantity: 1,
        checkIn,
        checkOut
      })
      if (order?.id) {
        Taro.navigateTo({ url: `/pages/order-pay/index?id=${order.id}` })
      } else {
        Taro.showToast({ title: '下单成功，请前往订单页支付', icon: 'none' })
      }
    } catch (err) {
    } finally {
      setBookingRoomId(null)
    }
  }

  const handleShare = () => {
    const sharePath = `/pages/detail/index?id=${id}&checkIn=${checkIn || ''}&checkOut=${checkOut || ''}`
    const shareText = `${hotel?.name || '易宿酒店'} ${sharePath}`
    Taro.setClipboardData({
      data: shareText,
      success: () => Taro.showToast({ title: '分享链接已复制', icon: 'success' }),
      fail: () => Taro.showToast({ title: '复制失败，请稍后重试', icon: 'none' })
    })
  }

  const handleCollect = async () => {
    try {
      const { collected: nextCollected } = await toggleFavoriteHotel({
        ...hotel,
        id,
        lowestPrice: minRoomPrice
      })
      setCollected(nextCollected)
      Taro.showToast({ title: nextCollected ? '收藏成功' : '已取消收藏', icon: 'success' })
    } catch (error) {
      Taro.showToast({ title: '操作失败，请稍后重试', icon: 'none' })
    }
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
  
  const rawRoomTypes = hotel.roomTypes?.length > 0
    ? hotel.roomTypes
    : hotel.room_types?.length > 0
      ? hotel.room_types
      : [] // 移除默认假数据，没有就是没有


  const calculateFinalPrice = (room) => {
    const price = Number(room.price) || 0
    const discount = Number(room.discount_rate) || 0
    const quota = Number(room.discount_quota) || 0
    let finalPrice = price
    
    if (quota > 0) {
      if (discount > 0 && discount <= 10) {
        finalPrice = price * (discount / 10)
      } else if (discount < 0) {
        finalPrice = Math.max(0, price + discount)
      }
    }
    return Math.round(finalPrice * 100) / 100
  }

  const roomTypes = [...rawRoomTypes].sort((a, b) => {
    return calculateFinalPrice(a) - calculateFinalPrice(b)
  })
  
  const minRoomPrice = roomTypes.length ? calculateFinalPrice(roomTypes[0]) : null

  const nights = () => {
    if (!checkIn || !checkOut) return 1
    const diff = (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
    return Math.max(1, diff)
  }

  const openingYear = hotel.opening_time ? hotel.opening_time.split('-')[0] : ''
  const checkinPolicy = hotel.check_in_time || '14:00后'
  const checkoutPolicy = hotel.check_out_time || '12:00前'
  const childPolicy = hotel.child_policy || '欢迎儿童入住'

  const getRoomMeta = (room) => {
    const meta = []
    if (Number(room.area) > 0) {
      meta.push(`${room.area}㎡`)
    }
    if (Number(room.bed_width) > 0) {
      meta.push(`床宽${room.bed_width}m`)
    }
    if (Number(room.capacity) > 0) {
      meta.push(`可住${room.capacity}人`)
    }
    if (Number(room.ceiling_height) > 0) {
      meta.push(`层高${room.ceiling_height}m`)
    }
    return meta.length > 0 ? meta.join(' · ') : '以酒店实际安排为准'
  }

  const isBooking = Boolean(bookingRoomId)

  return (
    <View className="detail-page">
      <PageTopBar
        title={hotel.name}
        transparent
        fixed
        elevated={navOpacity >= 0.6}
        titleStyle={{ opacity: navOpacity }}
        rightActions={[
          {
            key: 'share',
            icon: <SendOutline className="detail-top-action-icon" />,
            onClick: handleShare
          },
          {
            key: 'collect',
            icon: collected ? <HeartFill className="detail-top-action-icon" /> : <HeartOutline className="detail-top-action-icon" />,
            onClick: handleCollect,
            active: collected
          }
        ]}
      />

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
                {img && !bannerImageError[idx] ? (
                  <Image
                    className="banner-img"
                    src={img}
                    mode="aspectFill"
                    onError={() => setBannerImageError((prev) => ({ ...prev, [idx]: true }))}
                  />
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

          {openingYear && (
            <Text className="hotel-meta">{openingYear}年开业</Text>
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
            {hotel.promotions.map((promo, idx) => {
              if (typeof promo === 'string') {
                return (
                  <View key={idx} className="promo-item">
                    <Text className="promo-tag">惠</Text>
                    <Text className="promo-text">{promo}</Text>
                  </View>
                )
              }
              const label = promo.title || promo.type || '优惠'
              const valNum = Number(promo.value) || 0
              const value = valNum > 0 && valNum <= 10 ? `${valNum}折` : valNum < 0 ? `减¥${Math.abs(valNum)}` : ''
              const periodLabel = formatPeriodLabel(promo.periods)
              return (
                <View key={idx} className="promo-item">
                  <Text className="promo-tag">惠</Text>
                  <Text className="promo-text">{label} {value} 有效期 {periodLabel}</Text>
                </View>
              )
            })}
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
              <Text className="nights-text">{nights()}晚</Text>
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
          {roomTypes.length === 0 ? (
            <View className="empty-rooms glass-card" style={{ padding: '30px', textAlign: 'center' }}>
              <Text style={{ color: '#999' }}>该酒店暂无上架房型</Text>
            </View>
          ) : (
            roomTypes.map((room, roomIndex) => (
            <View key={room.id} className="room-card glass-card">
              <View className="room-img-wrap">
                {(() => {
                  const roomImageSrc = (Array.isArray(room.images) && room.images[0]) || room.image
                  const roomKey = room.id ?? `room-${roomIndex}`
                  if (roomImageSrc && !roomImageError[roomKey]) {
                    return (
                      <Image
                        className="room-img"
                        src={roomImageSrc}
                        mode="aspectFill"
                        onError={() => setRoomImageError((prev) => ({ ...prev, [roomKey]: true }))}
                      />
                    )
                  }
                  return <View className="room-img-placeholder"></View>
                })()}
              </View>
              <View className="room-info">
                <Text className="room-name">{room.name}</Text>
                <View className="room-tags">
                  {(room.breakfast || room.breakfast_included) && <Text className="room-tag green">含早</Text>}
                  {room.cancelable && <Text className="room-tag blue">免费取消</Text>}
                  {room.wifi && <Text className="room-tag blue">免费WiFi</Text>}
                </View>
                <View className="room-detail">
                  <Text className="room-size">{getRoomMeta(room)}</Text>
                </View>
              </View>
              <View className="room-right">
                <View className="room-price">
                  <Text className="price-symbol">¥</Text>
                  <Text className="price-num">
                    {calculateFinalPrice(room)}
                  </Text>
                  {(() => {
                    const discount = Number(room.discount_rate) || 0
                    const quota = Number(room.discount_quota) || 0
                    if (discount !== 0 && quota > 0) {
                      return (
                        <Text className="original-price" style={{ textDecoration: 'line-through', color: '#999', fontSize: '12px', marginLeft: '4px' }}>
                          ¥{room.price}
                        </Text>
                      )
                    }
                    return null
                  })()}
                </View>
                {(() => {
                  const discount = Number(room.discount_rate) || 0
                  const quota = Number(room.discount_quota) || 0
                  if (discount !== 0 && quota > 0) {
                    const text = discount < 0 ? `减¥${Math.abs(discount)}` : `${discount}折`
                    return (
                      <View className="discount-tag-wrap" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                         <Text className="discount-tag" style={{ background: '#ff4d4f', color: '#fff', fontSize: '10px', padding: '0 4px', borderRadius: '4px' }}>{text}</Text>
                      </View>
                    )
                  }
                  return null
                })()}
                <View 
                  className={`book-btn ${bookingRoomId === room.id ? 'loading' : ''}`}
                  onClick={() => {
                    if (bookingRoomId !== room.id) {
                      handleBook(room)
                    }
                  }}
                >
                  {bookingRoomId === room.id ? '预订中' : '预订'}
                </View>
              </View>
            </View>
          )))}
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

        {(hotel.nearby_attractions?.length || hotel.nearby_transport?.length || hotel.nearby_malls?.length) && (
          <View className="nearby-section glass-card">
            <Text className="section-title">周边信息</Text>
            {hotel.nearby_attractions?.length > 0 && (
              <View className="nearby-item">
                <Text className="nearby-label">热门景点</Text>
                <View className="nearby-tags">
                  {hotel.nearby_attractions.map((item, idx) => (
                    <Text key={idx} className="nearby-tag">{item}</Text>
                  ))}
                </View>
              </View>
            )}
            {hotel.nearby_transport?.length > 0 && (
              <View className="nearby-item">
                <Text className="nearby-label">交通出行</Text>
                <View className="nearby-tags">
                  {hotel.nearby_transport.map((item, idx) => (
                    <Text key={idx} className="nearby-tag">{item}</Text>
                  ))}
                </View>
              </View>
            )}
            {hotel.nearby_malls?.length > 0 && (
              <View className="nearby-item">
                <Text className="nearby-label">购物商场</Text>
                <View className="nearby-tags">
                  {hotel.nearby_malls.map((item, idx) => (
                    <Text key={idx} className="nearby-tag">{item}</Text>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* 酒店政策 */}
        <View className="policy-section glass-card">
          <Text className="section-title">酒店政策</Text>
          <View className="policy-item">
            <Text className="policy-label">入住时间</Text>
            <Text className="policy-value">{checkinPolicy}</Text>
          </View>
          <View className="policy-item">
            <Text className="policy-label">离店时间</Text>
            <Text className="policy-value">{checkoutPolicy}</Text>
          </View>
          <View className="policy-item">
            <Text className="policy-label">儿童政策</Text>
            <Text className="policy-value">{childPolicy}</Text>
          </View>
        </View>

        {/* 底部占位 */}
        <View className="bottom-placeholder"></View>
      </ScrollView>

      {/* 底部预订栏 */}
      <View className="bottom-bar glass-card">
        <View className="bottom-left">
          <View className="bottom-action" onClick={handleCollect}>
            {collected ? <HeartFill className="action-icon" /> : <HeartOutline className="action-icon" />}
            <Text className="action-text">{collected ? '已收藏' : '收藏'}</Text>
          </View>
          <View className="bottom-action" onClick={() => Taro.showToast({ title: '客服咨询开发中', icon: 'none' })}>
            <MessageOutline className="action-icon" />
            <Text className="action-text">咨询</Text>
          </View>
        </View>
        <View className="bottom-right">
          {minRoomPrice ? (
            <>
              <View className="price-info">
                <Text className="price-from">¥</Text>
                <Text className="price-value">{minRoomPrice}</Text>
                <Text className="price-suffix">起</Text>
              </View>
              <GlassButton
                tone='primary'
                fill='solid'
                size='large'
                loading={isBooking}
                className='main-book-btn'
                onClick={() => {
                  if (!isBooking) {
                    handleBook(roomTypes[0])
                  }
                }}
              >
                立即预订
              </GlassButton>
            </>
          ) : (
            <View className="price-info" style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Text className="price-suffix">暂无房型可订</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  )
}
