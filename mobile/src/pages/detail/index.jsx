import { View, Text, Image, ScrollView, Swiper, SwiperItem } from '@tarojs/components'
import { useRouter } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarPicker, Popup, Selector, Input, Button } from 'antd-mobile'
import { api, resolveImageUrl } from '../../services/request'
import { isFavoriteHotel, toggleFavoriteHotel } from '../../services/favorites'
import PageTopBar from '../../components/PageTopBar'
import BookingBottomBar from '../../components/BookingBottomBar'
import { createListByType } from '../../components/OrderList'
import { formatDate, getCalendarBounds, parseLocalDate, resolveDateRange } from '../../utils/dateRange'
import { SendOutline, HeartOutline, HeartFill, MessageOutline, CalendarOutline, FilterOutline } from 'antd-mobile-icons'
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

const formatDiscountLabel = (value) => {
  if (value === null || value === undefined || value === '') return ''
  const num = Number(value)
  if (Number.isFinite(num)) {
    if (num > 0 && num <= 10) return `${num}折`
    if (num < 0) return `减¥${Math.abs(num)}`
  }
  const text = String(value).trim()
  if (!text) return ''
  const matched = text.match(/([1-9](?:\.\d+)?折|减¥?\s*\d+(?:\.\d+)?)/)
  const discountText = matched?.[0] ? matched[0] : text
  const normalized = discountText.replace(/\s+/g, '')
  return normalized.startsWith('减') && !normalized.startsWith('减¥')
    ? normalized.replace(/^减/, '减¥')
    : normalized
}

const getPromotionDisplay = (promotion) => {
  if (typeof promotion === 'string') {
    const raw = promotion.trim()
    if (!raw) return { name: '优惠', discount: '折扣待定', period: '' }
    const matched = raw.match(/([1-9](?:\.\d+)?折|减¥?\s*\d+(?:\.\d+)?)/)
    const discount = formatDiscountLabel(matched?.[0]) || '折扣待定'
    const name = matched?.[0] ? raw.replace(matched[0], '').trim() : raw
    return { name: name || '优惠', discount, period: '' }
  }

  const name = String(promotion?.title || promotion?.name || promotion?.type || '优惠').trim() || '优惠'
  const discount = formatDiscountLabel(
    promotion?.value ??
    promotion?.discount ??
    promotion?.discount_rate ??
    promotion?.count ??
    promotion?.discount_label
  ) || '折扣待定'
  const period = formatPeriodLabel(promotion?.periods)
  return { name, discount, period }
}

const defaultRoomFilters = {
  roomTypeId: 'all',
  rooms: '',
  guests: ''
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
  const [heroExpanded, setHeroExpanded] = useState(false)
  const scrollTopRef = useRef(0)
  const touchStartYRef = useRef(0)
  const isPullingRef = useRef(false)
  const pullDeltaRef = useRef(0)
  const [bannerImageError, setBannerImageError] = useState({})
  const [bannerIndex, setBannerIndex] = useState(0)
  const [bookingRoomId, setBookingRoomId] = useState(null)
  const [collected, setCollected] = useState(false)
  const [calendarVisible, setCalendarVisible] = useState(false)
  const [filterVisible, setFilterVisible] = useState(false)
  const [roomFilters, setRoomFilters] = useState(defaultRoomFilters)
  const [draftFilters, setDraftFilters] = useState(defaultRoomFilters)

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
    setHeroExpanded(false)
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
    scrollTopRef.current = scrollTop
    const opacity = Math.min(scrollTop / 150, 1)
    setNavOpacity(opacity)
    // 向下滚动超过 60px 时自动收起 hero
    if (scrollTop > 60 && heroExpanded) {
      setHeroExpanded(false)
    }
  }

  const handleTouchStart = (e) => {
    touchStartYRef.current = e.touches[0].clientY
    isPullingRef.current = scrollTopRef.current <= 2
  }

  const handleTouchMove = (e) => {
    if (!isPullingRef.current) return
    const deltaY = e.touches[0].clientY - touchStartYRef.current
    if (deltaY > 0) {
      pullDeltaRef.current = Math.min(deltaY, 140)
    }
  }

  const handleTouchEnd = () => {
    if (pullDeltaRef.current > 60) {
      setHeroExpanded(true)
    }
    pullDeltaRef.current = 0
    isPullingRef.current = false
  }

  const handleBook = async (room) => {
    if (!room || bookingRoomId) return
    if (getAvailableCount(room) <= 0) {
      Taro.showToast({ title: '该房型已售罄', icon: 'none' })
      return
    }
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

  const openFilter = () => {
    setDraftFilters(roomFilters)
    setFilterVisible(true)
  }

  const handleApplyFilters = () => {
    setRoomFilters(draftFilters)
    setFilterVisible(false)
  }

  const handleResetFilters = () => {
    setDraftFilters(defaultRoomFilters)
  }

  const safeHotel = hotel || {}

  const images = safeHotel.images?.length > 0 
    ? safeHotel.images 
    : [safeHotel.cover_image || null]
  
  const facilities = safeHotel.facilities?.length > 0 
    ? safeHotel.facilities 
    : defaultFacilities
  
  const rawRoomTypes = safeHotel.roomTypes?.length > 0
    ? safeHotel.roomTypes
    : safeHotel.room_types?.length > 0
      ? safeHotel.room_types
      : [] // 移除默认假数据，没有就是没有

  const roomTypes = [...rawRoomTypes].sort((a, b) => {
    const priceA = Number(a?.display_price)
    const priceB = Number(b?.display_price)
    if (!Number.isFinite(priceA) && !Number.isFinite(priceB)) return 0
    if (!Number.isFinite(priceA)) return 1
    if (!Number.isFinite(priceB)) return -1
    return priceA - priceB
  })

  // 所有房型（含库存=0的）的图片数据，用于幻灯片
  const allRoomTypeSlides = safeHotel.allRoomTypeSlides

  // 合并酒店图片 + 各房型图片，构成统一幻灯片列表
  // 去重规则：
  //   - 酒店主图组内去重
  //   - 每个房型组内去重
  //   - 但不同房型之间、房型与酒店主图之间不做全局去重
  //     （保证每个房型在幻灯片中完整出现，即使 URL 与其他分组相同）
  const allSlides = useMemo(() => {
    const slides = []

    // 酒店主图（组内去重）
    const hotelSeen = new Set()
    ;(images || []).filter(Boolean).forEach((src) => {
      if (hotelSeen.has(src)) return
      hotelSeen.add(src)
      slides.push({ src, label: null, labelSub: null })
    })

    // 优先使用 allRoomTypeSlides（后端返回的全量房型），否则回退到已过滤的 roomTypes
    const roomsForSlides = Array.isArray(allRoomTypeSlides) && allRoomTypeSlides.length > 0
      ? allRoomTypeSlides
      : roomTypes

    roomsForSlides.forEach((room) => {
      const roomImgs = Array.isArray(room.images) && room.images.length > 0
        ? room.images.filter(Boolean)
        : []
      if (!roomImgs.length) return

      // 从已过滤的 roomTypes 中查找该房型的价格（供幻灯片标注）
      const matched = roomTypes.find((r) => String(r.id) === String(room.id))
      const price = Number(matched?.display_price)
      const priceTxt = Number.isFinite(price) ? `¥${price}/晚` : ''

      // 每个房型组内去重，但不与其他组交叉去重
      const roomSeen = new Set()
      roomImgs.forEach((src) => {
        if (roomSeen.has(src)) return
        roomSeen.add(src)
        slides.push({ src, label: room.name || '客房', labelSub: priceTxt })
      })
    })

    return slides
  }, [images, roomTypes, allRoomTypeSlides])

  const normalizePositiveInt = (value) => {
    const num = Number(value)
    if (!Number.isFinite(num) || num <= 0) return null
    return Math.floor(num)
  }

  const getAvailableCount = (room) => {
    const available = Number(room?.available_count)
    if (Number.isFinite(available)) return available
    const stock = Number(room?.stock)
    return Number.isFinite(stock) ? stock : 0
  }

  const normalizedRoomCount = normalizePositiveInt(roomFilters.rooms)
  const normalizedGuestCount = normalizePositiveInt(roomFilters.guests)
  const hasRoomTypeFilter = roomFilters.roomTypeId && roomFilters.roomTypeId !== 'all'
  const hasActiveRoomFilter = hasRoomTypeFilter || Boolean(normalizedRoomCount) || Boolean(normalizedGuestCount)

  const roomTypeOptions = useMemo(() => {
    const options = [{ label: '不限', value: 'all' }]
    const seen = new Set()
    roomTypes.forEach((room) => {
      const id = String(room?.id || '')
      if (!id || seen.has(id)) return
      seen.add(id)
      options.push({ label: room?.name || '未知房型', value: id })
    })
    return options
  }, [roomTypes])

  const selectedRoomTypeLabel = useMemo(() => {
    const target = roomTypeOptions.find((item) => String(item.value) === String(roomFilters.roomTypeId))
    return target?.label || '不限'
  }, [roomTypeOptions, roomFilters.roomTypeId])

  const filterSummary = (() => {
    if (!hasActiveRoomFilter) return '筛选房型'
    const parts = []
    if (hasRoomTypeFilter) parts.push(selectedRoomTypeLabel)
    if (normalizedRoomCount) parts.push(`${normalizedRoomCount}间`)
    if (normalizedGuestCount) parts.push(`${normalizedGuestCount}人`)
    return parts.length > 0 ? parts.join(' · ') : '筛选房型'
  })()

  const resolveRequiredRooms = (room) => {
    if (normalizedRoomCount) return normalizedRoomCount
    if (!normalizedGuestCount) return null
    const capacity = Number(room?.capacity)
    if (!Number.isFinite(capacity) || capacity <= 0) return null
    return Math.ceil(normalizedGuestCount / capacity)
  }

  const matchRoomFilter = (room) => {
    if (hasRoomTypeFilter && String(room?.id) !== String(roomFilters.roomTypeId)) return false
    const requiredRooms = resolveRequiredRooms(room)
    if (normalizedGuestCount) {
      const capacity = Number(room?.capacity)
      if (!Number.isFinite(capacity) || capacity <= 0) return false
      const totalCapacity = capacity * (requiredRooms || 0)
      if (totalCapacity < normalizedGuestCount) return false
    }
    if (requiredRooms && getAvailableCount(room) < requiredRooms) return false
    return true
  }

  const matchedRooms = useMemo(() => {
    if (!hasActiveRoomFilter) return roomTypes
    return roomTypes.filter(matchRoomFilter)
  }, [roomTypes, hasActiveRoomFilter, hasRoomTypeFilter, roomFilters.roomTypeId, normalizedRoomCount, normalizedGuestCount])

  const otherRooms = useMemo(() => {
    if (!hasActiveRoomFilter) return []
    return roomTypes.filter((room) => !matchRoomFilter(room))
  }, [roomTypes, hasActiveRoomFilter, hasRoomTypeFilter, roomFilters.roomTypeId, normalizedRoomCount, normalizedGuestCount])

  const displayRoomTypes = hasActiveRoomFilter && matchedRooms.length > 0 ? [...matchedRooms, ...otherRooms] : roomTypes
  const firstBookableRoom = displayRoomTypes.find((room) => getAvailableCount(room) > 0) || null
  const hasBookableRoom = Boolean(firstBookableRoom)

  const minRoomPrice = Number(safeHotel?.lowestPrice)
  const hasMinRoomPrice = Number.isFinite(minRoomPrice)

  const nights = () => {
    if (!checkIn || !checkOut) return 1
    const checkInDate = parseLocalDate(checkIn)
    const checkOutDate = parseLocalDate(checkOut)
    if (!checkInDate || !checkOutDate) return 1
    const diff = (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)
    return Math.max(1, diff)
  }

  const openingYear = safeHotel.opening_time ? safeHotel.opening_time.split('-')[0] : ''
  const checkinPolicy = safeHotel.check_in_time || '14:00后'
  const checkoutPolicy = safeHotel.check_out_time || '12:00前'
  const childPolicy = safeHotel.child_policy || '欢迎儿童入住'
  const starCount = Math.max(0, Math.min(5, Number(safeHotel?.star_rating) || 0))

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
  const renderRoomList = (items, emptyText) => (
    createListByType({
      type: 'room',
      items,
      embedded: true,
      animate: true,
      footer: null,
      emptyText,
      containerClassName: 'room-list-container',
      listClassName: 'room-list',
      bookingRoomId,
      roomMetaResolver: getRoomMeta,
      roomSoldOutResolver: (room) => getAvailableCount(room) <= 0,
      onBook: handleBook,
      onOpen: handleOpenRoomDetail
    })
  )

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
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        scrollWithAnimation
      >
        {/* Hero 大图区 */}
        <View className={`hero-section${heroExpanded ? ' hero-expanded' : ''}`}>
          {/* 模糊背景层：所有幻灯片预渲染，opacity 切换 */}
          <View className="hero-bg-wrap">
            {allSlides.map((slide, idx) => (
              slide.src && !bannerImageError[idx] ? (
                <Image
                  key={idx}
                  className={`hero-bg-img${idx === bannerIndex ? ' hero-bg-active' : ''}`}
                  src={resolveImageUrl(slide.src, { quality: 40 })}
                  mode="aspectFill"
                  alt=""
                />
              ) : idx === bannerIndex ? (
                <View key={idx} className={`hero-bg-fallback${idx === bannerIndex ? ' hero-bg-active' : ''}`} />
              ) : null
            ))}
          </View>
          <Swiper
            className="hero-swiper"
            indicatorDots={false}
            onChange={(e) => setBannerIndex(e?.detail?.current || 0)}
          >
            {allSlides.map((slide, idx) => {
              const hasError = Boolean(bannerImageError[idx])
              const showImage = slide.src && !hasError
              return (
                <SwiperItem key={idx}>
                  <View className="hero-swiper-item">
                    {showImage ? (
                      <Image
                        className="hero-img"
                        src={resolveImageUrl(slide.src, { quality: 80 })}
                        mode={heroExpanded ? 'aspectFit' : 'aspectFill'}
                        alt={slide.label || '酒店图片'}
                        onError={() => setBannerImageError((prev) => ({ ...prev, [idx]: true }))}
                      />
                    ) : (
                      <View className="hero-img-placeholder" />
                    )}
                  </View>
                </SwiperItem>
              )
            })}
          </Swiper>
          <View className="hero-overlay" />

          {/* 房型标签：当前幻灯片属于某房型时显示 */}
          {allSlides[bannerIndex]?.label && (
            <View className="hero-room-label">
              <Text className="hero-room-label-tag">房型</Text>
              <Text className="hero-room-label-name">{allSlides[bannerIndex].label}</Text>
              {allSlides[bannerIndex].labelSub ? (
                <Text className="hero-room-label-price">{allSlides[bannerIndex].labelSub}</Text>
              ) : null}
            </View>
          )}

          {/* 下拉提示条：未展开时显示 */}
          {!heroExpanded && (
            <View className="hero-pull-hint">
              <Text className="hero-pull-hint-text">下拉展开全图</Text>
            </View>
          )}
          {/* 当前图片计数 */}
          <View className="hero-img-count">
            <Text className="hero-img-count-text">{bannerIndex + 1} / {allSlides.length}</Text>
          </View>
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
              const { name, discount, period } = getPromotionDisplay(promo)
              const text = period ? `${name} ${discount} 有效期 ${period}` : `${name} ${discount}`
              return (
                <View key={idx} className="promo-item">
                  <Text className="promo-tag">惠</Text>
                  <Text className="promo-text">{text}</Text>
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
          <View className="room-filter-bar glass-card">
            <View className="room-filter-summary">
              <Text className="room-filter-title">筛选条件</Text>
              <Text className={`room-filter-desc${hasActiveRoomFilter ? ' active' : ''}`}>{filterSummary}</Text>
            </View>
            <View className="room-filter-action" onClick={openFilter}>
              <FilterOutline className="room-filter-icon" />
              <Text className="room-filter-text">筛选</Text>
            </View>
          </View>

          {hasActiveRoomFilter ? (
            matchedRooms.length > 0 ? (
              <>
                <Text className="room-filter-group-title">符合条件的房型</Text>
                {renderRoomList(matchedRooms, '暂无符合条件的房型')}
                {otherRooms.length > 0 ? (
                  <>
                    <View className="room-filter-divider">
                      <View className="room-filter-divider-line" />
                      <Text className="room-filter-divider-text">其他房型</Text>
                      <View className="room-filter-divider-line" />
                    </View>
                    {renderRoomList(otherRooms, '')}
                  </>
                ) : null}
              </>
            ) : (
              <>
                <Text className="room-filter-empty-tip">暂无符合条件的房型，已展示其他房型</Text>
                {renderRoomList(roomTypes, '该酒店暂无上架房型')}
              </>
            )
          ) : (
            renderRoomList(roomTypes, '该酒店暂无上架房型')
          )}
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
        actionText={hasBookableRoom ? '立即预订' : '已售罄'}
        disabled={isBooking || !hasBookableRoom}
        actionClassName='main-book-btn'
        onAction={() => {
          if (!isBooking && firstBookableRoom) {
            handleBook(firstBookableRoom)
          }
        }}
      />

      <Popup
        visible={filterVisible}
        onMaskClick={() => setFilterVisible(false)}
        bodyStyle={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}
      >
        <View className="room-filter-panel">
          <Text className="room-filter-panel-title">筛选条件</Text>

          <View className="room-filter-section">
            <Text className="room-filter-label">房型</Text>
            <Selector
              options={roomTypeOptions}
              value={[draftFilters.roomTypeId]}
              onChange={(value) => {
                setDraftFilters((prev) => ({ ...prev, roomTypeId: value?.[0] || 'all' }))
              }}
            />
          </View>

          <View className="room-filter-section">
            <Text className="room-filter-label">间数</Text>
            <Input
              type="number"
              placeholder="不限"
              value={draftFilters.rooms}
              clearable
              onChange={(value) => setDraftFilters((prev) => ({ ...prev, rooms: value }))}
            />
          </View>

          <View className="room-filter-section">
            <Text className="room-filter-label">人数</Text>
            <Input
              type="number"
              placeholder="不限"
              value={draftFilters.guests}
              clearable
              onChange={(value) => setDraftFilters((prev) => ({ ...prev, guests: value }))}
            />
          </View>

          <View className="room-filter-actions">
            <Button onClick={handleResetFilters}>重置</Button>
            <Button color="primary" onClick={handleApplyFilters}>应用</Button>
          </View>
        </View>
      </Popup>

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
