import { View, Text, Image, ScrollView, Swiper, SwiperItem } from '@tarojs/components'
import { useRouter } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import { CalendarPicker } from 'antd-mobile'
import { api, resolveImageUrl } from '../../services/request'
import { isFavoriteHotel, toggleFavoriteHotel } from '../../services/favorites'
import PageTopBar from '../../components/PageTopBar'
import BookingBottomBar from '../../components/BookingBottomBar'
import { createListByType } from '../../components/OrderList'
import { formatDate, getCalendarBounds, parseLocalDate, resolveDateRange } from '../../utils/dateRange'
import { SendOutline, HeartOutline, HeartFill, MessageOutline, CalendarOutline } from 'antd-mobile-icons'
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

export default function Detail() {
  const router = useRouter()
  const { id } = router.params
  const SEARCH_STORAGE_KEY = 'hotel_search_params'
  const storedParams = Taro.getStorageSync(SEARCH_STORAGE_KEY) || {}
  const initialDateRange = resolveDateRange({
    checkIn: router?.params?.checkIn || storedParams.checkIn,
    checkOut: router?.params?.checkOut || storedParams.checkOut
  })
  const [checkIn, setCheckIn] = useState(() => initialDateRange.checkIn)
  const [checkOut, setCheckOut] = useState(() => initialDateRange.checkOut)
  const calendarBounds = useMemo(() => getCalendarBounds(), [])

  const [hotel, setHotel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [navOpacity, setNavOpacity] = useState(0)
  const [bookingRoomId, setBookingRoomId] = useState(null)
  const [collected, setCollected] = useState(false)
  const [bannerImageError, setBannerImageError] = useState({})
  const [bannerIndex, setBannerIndex] = useState(0)
  const [calendarVisible, setCalendarVisible] = useState(false)
  const bannerSize = useMemo(() => {
    if (process.env.TARO_ENV !== 'h5') return { width: null, height: null }
    try {
      const info = Taro.getSystemInfoSync() || {}
      const width = Math.round(info.windowWidth || 375)
      return { width, height: 280 }
    } catch (error) {
      return { width: 375, height: 280 }
    }
  }, [])

  useEffect(() => {
    fetchHotelDetail()
  }, [id, checkIn, checkOut])

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
    setBannerIndex(0)
  }, [id])

  useEffect(() => {
    const prev = Taro.getStorageSync(SEARCH_STORAGE_KEY) || {}
    Taro.setStorageSync(SEARCH_STORAGE_KEY, {
      ...prev,
      checkIn,
      checkOut
    })
  }, [checkIn, checkOut])

  const fetchHotelDetail = async () => {
    try {
      setLoading(true)
      const query = new URLSearchParams()
      if (checkIn) query.append('checkIn', checkIn)
      if (checkOut) query.append('checkOut', checkOut)
      const data = await api.get(`/api/hotels/${id}${query.toString() ? `?${query.toString()}` : ''}`)
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

  const handleOpenRoomDetail = (room) => {
    if (!room?.id) return
    const query = [
      `hotelId=${encodeURIComponent(String(id || ''))}`,
      `roomId=${encodeURIComponent(String(room.id))}`,
      `checkIn=${encodeURIComponent(String(checkIn || ''))}`,
      `checkOut=${encodeURIComponent(String(checkOut || ''))}`
    ].join('&')
    Taro.navigateTo({ url: `/pages/room-detail/index?${query}` })
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
        lowestPrice: hasMinRoomPrice ? minRoomPrice : null
      })
      setCollected(nextCollected)
      Taro.showToast({ title: nextCollected ? '收藏成功' : '已取消收藏', icon: 'success' })
    } catch (error) {
      Taro.showToast({ title: '操作失败，请稍后重试', icon: 'none' })
    }
  }

  const handleDateConfirm = (val) => {
    if (val && val[0] && val[1]) {
      setCheckIn(formatDate(val[0]))
      setCheckOut(formatDate(val[1]))
      setCalendarVisible(false)
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

  const roomTypes = [...rawRoomTypes].sort((a, b) => {
    const priceA = Number(a?.display_price)
    const priceB = Number(b?.display_price)
    if (!Number.isFinite(priceA) && !Number.isFinite(priceB)) return 0
    if (!Number.isFinite(priceA)) return 1
    if (!Number.isFinite(priceB)) return -1
    return priceA - priceB
  })

  const minRoomPrice = Number(hotel?.lowestPrice)
  const hasMinRoomPrice = Number.isFinite(minRoomPrice)

  const nights = () => {
    if (!checkIn || !checkOut) return 1
    const checkInDate = parseLocalDate(checkIn)
    const checkOutDate = parseLocalDate(checkOut)
    if (!checkInDate || !checkOutDate) return 1
    const diff = (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)
    return Math.max(1, diff)
  }

  const openingYear = hotel.opening_time ? hotel.opening_time.split('-')[0] : ''
  const checkinPolicy = hotel.check_in_time || '14:00后'
  const checkoutPolicy = hotel.check_out_time || '12:00前'
  const childPolicy = hotel.child_policy || '欢迎儿童入住'
  const starCount = Math.max(0, Math.min(5, Number(hotel?.star_rating) || 0))

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
          <Swiper
            className="banner-swiper"
            indicatorDots
            indicatorColor="rgba(255,255,255,0.5)"
            indicatorActiveColor="#fff"
            onChange={(event) => setBannerIndex(event?.detail?.current || 0)}
          >
            {images.map((img, idx) => {
              const canLoad = idx <= bannerIndex + 1
              const hasError = Boolean(bannerImageError[idx])
              const showImage = img && !hasError && canLoad
              const showPlaceholderText = !img || hasError
              const optimizedImageSrc = resolveImageUrl(img, {
                width: bannerSize.width,
                height: bannerSize.height,
                quality: 70
              })
              return (
                <SwiperItem key={idx}>
                  {showImage ? (
                    <Image
                      className="banner-img"
                      src={optimizedImageSrc}
                      mode="aspectFill"
                      style={{ width: '100%', height: '280px' }}
                      lazyLoad={idx > 0}
                      onError={() => setBannerImageError((prev) => ({ ...prev, [idx]: true }))}
                    />
                  ) : (
                    <View className="banner-placeholder">
                      {showPlaceholderText ? <Text className="placeholder-text">暂无图片</Text> : null}
                    </View>
                  )}
                </SwiperItem>
              )
            })}
          </Swiper>
          <View className="banner-count">{images.length} 张</View>
        </View>

        {/* 酒店基本信息 */}
        <View className="hotel-info glass-card">
          <View className="info-header">
            <Text className="hotel-name">{hotel.name}</Text>
            {starCount > 0 ? (
              <View className="hotel-star">
                <Text className="star-icon">{'★'.repeat(starCount)}</Text>
              </View>
            ) : null}
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
        <View className="checkin-section glass-card" onClick={() => setCalendarVisible(true)}>
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
            <CalendarOutline className='checkin-icon' />
          </View>
        </View>

        {/* 房型列表 */}
        <View className="room-section">
          <Text className="section-title">房型选择</Text>
          {createListByType({
            type: 'room',
            items: roomTypes,
            embedded: true,
            animate: true,
            footer: null,
            emptyText: '该酒店暂无上架房型',
            containerClassName: 'room-list-container',
            listClassName: 'room-list',
            bookingRoomId,
            roomMetaResolver: getRoomMeta,
            onBook: handleBook,
            onOpen: handleOpenRoomDetail
          })}
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

      <BookingBottomBar
        leftContent={(
          <View className='bottom-left'>
            <View className='bottom-action' onClick={handleCollect}>
              {collected ? <HeartFill className='action-icon' /> : <HeartOutline className='action-icon' />}
              <Text className='action-text'>{collected ? '已收藏' : '收藏'}</Text>
            </View>
            <View className='bottom-action' onClick={() => Taro.showToast({ title: '客服咨询开发中', icon: 'none' })}>
              <MessageOutline className='action-icon' />
              <Text className='action-text'>咨询</Text>
            </View>
          </View>
        )}
        price={minRoomPrice}
        priceSuffix='起'
        emptyText='暂无房型可订'
        showAction={hasMinRoomPrice}
        loading={isBooking}
        actionClassName='main-book-btn'
        onAction={() => {
          if (!isBooking && roomTypes.length > 0) {
            handleBook(roomTypes[0])
          }
        }}
      />

      <CalendarPicker
        selectionMode='range'
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        onConfirm={handleDateConfirm}
        min={calendarBounds.min}
        max={calendarBounds.max}
        defaultValue={[parseLocalDate(checkIn), parseLocalDate(checkOut)]}
      />
    </View>
  )
}
