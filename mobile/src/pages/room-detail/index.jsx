import { useEffect, useMemo, useState } from 'react'
import { View, Text, Image, ScrollView, Swiper, SwiperItem } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { CalendarPicker } from 'antd-mobile'
import { CalendarOutline } from 'antd-mobile-icons'
import { api, resolveImageUrl } from '../../services/request'
import PageTopBar from '../../components/PageTopBar'
import BookingBottomBar from '../../components/BookingBottomBar'
import { formatDate, getCalendarBounds, parseLocalDate, resolveDateRange } from '../../utils/dateRange'
import './index.css'

const formatPeriodLabel = (periods) => {
  const list = Array.isArray(periods) ? periods : []
  if (!list.length) return '长期'
  const pad = (val) => String(val).padStart(2, '0')
  const formatDateTime = (value) => {
    const date = value ? new Date(value) : null
    if (!date || Number.isNaN(date.getTime())) return ''
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
  }
  return list.map((item) => {
    const start = formatDateTime(item?.start)
    const end = formatDateTime(item?.end)
    if (!start || !end) return ''
    return `${start} ~ ${end}`
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
    if (!raw) return { name: '优惠', discount: '折扣待定' }
    const matched = raw.match(/([1-9](?:\.\d+)?折|减¥?\s*\d+(?:\.\d+)?)/)
    const discount = formatDiscountLabel(matched?.[0]) || '折扣待定'
    const name = matched?.[0] ? raw.replace(matched[0], '').trim() : raw
    return { name: name || '优惠', discount }
  }

  const name = String(promotion?.title || promotion?.name || promotion?.type || '优惠').trim() || '优惠'
  const discount = formatDiscountLabel(
    promotion?.value ??
    promotion?.discount ??
    promotion?.discount_rate ??
    promotion?.count ??
    promotion?.discount_label
  ) || '折扣待定'
  return { name, discount }
}

const getRoomMeta = (room) => {
  const meta = []
  if (Number(room?.area) > 0) meta.push(`${room.area}㎡`)
  if (Number(room?.bed_width) > 0) meta.push(`床宽${room.bed_width}m`)
  if (Number(room?.capacity) > 0) meta.push(`可住${room.capacity}人`)
  if (Number(room?.ceiling_height) > 0) meta.push(`层高${room.ceiling_height}m`)
  return meta.length > 0 ? meta.join(' · ') : '以酒店实际安排为准'
}

const getAvailableCount = (room) => {
  const available = Number(room?.available_count)
  if (Number.isFinite(available)) return available
  const stock = Number(room?.stock)
  return Number.isFinite(stock) ? stock : 0
}

export default function RoomDetail() {
  const router = useRouter()
  const hotelId = router?.params?.hotelId
  const roomId = router?.params?.roomId
  const SEARCH_STORAGE_KEY = 'hotel_search_params'
  const storedParams = Taro.getStorageSync(SEARCH_STORAGE_KEY) || {}
  const initialDateRange = resolveDateRange({
    checkIn: router?.params?.checkIn || storedParams.checkIn,
    checkOut: router?.params?.checkOut || storedParams.checkOut
  })
  const [checkIn, setCheckIn] = useState(() => initialDateRange.checkIn)
  const [checkOut, setCheckOut] = useState(() => initialDateRange.checkOut)
  const calendarBounds = useMemo(() => getCalendarBounds(), [])

  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [hotel, setHotel] = useState(null)
  const [room, setRoom] = useState(null)
  const [bannerImageError, setBannerImageError] = useState({})
  const [bannerIndex, setBannerIndex] = useState(0)
  const [navOpacity, setNavOpacity] = useState(0)
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

  const fetchRoomDetail = async () => {
    if (!hotelId || !roomId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const query = new URLSearchParams()
      if (checkIn) query.append('checkIn', checkIn)
      if (checkOut) query.append('checkOut', checkOut)
      const data = await api.get(`/api/hotels/${hotelId}${query.toString() ? `?${query.toString()}` : ''}`)
      const rooms = Array.isArray(data?.roomTypes) && data.roomTypes.length > 0
        ? data.roomTypes
        : (Array.isArray(data?.room_types) ? data.room_types : [])
      const matched = rooms.find((item) => String(item?.id) === String(roomId)) || null
      setHotel(data || null)
      setRoom(matched)
    } catch (error) {
      setHotel(null)
      setRoom(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoomDetail()
  }, [hotelId, roomId, checkIn, checkOut])

  useEffect(() => {
    setBannerImageError({})
    setBannerIndex(0)
  }, [roomId])

  useEffect(() => {
    const prev = Taro.getStorageSync(SEARCH_STORAGE_KEY) || {}
    Taro.setStorageSync(SEARCH_STORAGE_KEY, {
      ...prev,
      checkIn,
      checkOut
    })
  }, [checkIn, checkOut])

  const handleScroll = (event) => {
    const scrollTop = Number(event?.detail?.scrollTop) || 0
    setNavOpacity(Math.min(scrollTop / 100, 1))
  }

  const handleDateConfirm = (val) => {
    if (val && val[0] && val[1]) {
      setCheckIn(formatDate(val[0]))
      setCheckOut(formatDate(val[1]))
      setCalendarVisible(false)
    }
  }

  const handleBook = async () => {
    if (!room?.id || booking) return
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
    setBooking(true)
    try {
      const order = await api.post(`/api/hotels/${hotelId}/orders`, {
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
    } catch (error) {
    } finally {
      setBooking(false)
    }
  }

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 1
    const checkInDate = parseLocalDate(checkIn)
    const checkOutDate = parseLocalDate(checkOut)
    if (!checkInDate || !checkOutDate) return 1
    const diff = (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)
    if (!Number.isFinite(diff) || diff <= 0) return 1
    return Math.round(diff)
  }, [checkIn, checkOut])

  if (loading) {
    return (
      <View className='room-detail-page'>
        <PageTopBar title='房型详情' />
        <View className='room-detail-center'>
          <Text className='room-detail-tip'>加载中...</Text>
        </View>
      </View>
    )
  }

  if (!hotel || !room) {
    return (
      <View className='room-detail-page'>
        <PageTopBar title='房型详情' />
        <View className='room-detail-center'>
          <Text className='room-detail-tip'>房型信息不存在</Text>
        </View>
      </View>
    )
  }

  const roomImages = Array.isArray(room?.images) ? room.images.filter(Boolean) : []
  const images = roomImages.length > 0
    ? roomImages
    : [room?.image || hotel?.cover_image || null].filter(Boolean)
  const finalPrice = Number(room?.display_price)
  const basePrice = Number(room?.base_price)
  const hasPrice = Number.isFinite(finalPrice)
  const discountLabel = room?.room_discount_label || ''
  const hasRoomDiscount = Boolean(room?.has_room_discount)
  const activePromotions = Array.isArray(room?.effective_promotions) ? room.effective_promotions : []
  const roomDiscountText = formatDiscountLabel(discountLabel) || '折扣待定'
  const soldOut = getAvailableCount(room) <= 0
  const tags = [
    room?.breakfast || room?.breakfast_included ? '含早' : '',
    room?.cancelable ? '免费取消' : '',
    room?.wifi ? '免费WiFi' : ''
  ].filter(Boolean)

  return (
    <View className='room-detail-page'>
      <PageTopBar
        title={room?.name || '房型详情'}
        transparent
        fixed
        elevated={navOpacity >= 0.6}
        titleStyle={{ opacity: navOpacity }}
      />

      <ScrollView
        className='room-detail-scroll'
        scrollY
        onScroll={handleScroll}
        scrollWithAnimation
      >
        <View className='room-banner-section'>
          <Swiper
            className='room-banner-swiper'
            indicatorDots
            indicatorColor='rgba(255,255,255,0.5)'
            indicatorActiveColor='#fff'
            onChange={(event) => setBannerIndex(event?.detail?.current || 0)}
          >
            {images.length > 0 ? images.map((img, idx) => {
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
                <SwiperItem key={`${img}-${idx}`}>
                  {showImage ? (
                    <Image
                      className='room-banner-image'
                      src={optimizedImageSrc}
                      mode='aspectFill'
                      alt={room?.name || '房间图片'}
                      style={{ width: '100%', height: '280px' }}
                      lazyLoad={idx > 0}
                      onError={() => setBannerImageError((prev) => ({ ...prev, [idx]: true }))}
                    />
                  ) : (
                    <View className='room-banner-placeholder'>
                      {showPlaceholderText ? <Text className='room-banner-placeholder-text'>暂无图片</Text> : null}
                    </View>
                  )}
                </SwiperItem>
              )
            }) : (
              <SwiperItem key='empty'>
                <View className='room-banner-placeholder'>
                  <Text className='room-banner-placeholder-text'>暂无图片</Text>
                </View>
              </SwiperItem>
            )}
          </Swiper>
          <View className='room-banner-info'>
            <View className='room-banner-name'>{room?.name || '标准房型'}</View>
            <View className='room-banner-count'>{bannerIndex + 1} / {images.length || 1}</View>
          </View>
        </View>

        <View className='room-detail-content'>
          <View className='room-detail-hero-card'>
            <Text className='room-detail-name'>{room?.name || '标准房型'}</Text>
            <Text className='room-detail-hotel'>{hotel?.name || `酒店 #${hotelId}`}</Text>
            {tags.length > 0 ? (
              <View className='room-detail-tags'>
                {tags.map((tag) => (
                  <Text key={tag} className='room-detail-tag'>{tag}</Text>
                ))}
              </View>
            ) : null}
          </View>

          <View className='room-detail-date-card' onClick={() => setCalendarVisible(true)}>
            <View className='room-detail-date-row'>
              <View className='room-detail-date-item'>
                <Text className='room-detail-date-label'>入住</Text>
                <Text className='room-detail-date-value'>{checkIn || '选择日期'}</Text>
              </View>
              <View className='room-detail-date-mid'>
                <Text className='room-detail-date-nights'>{nights}晚</Text>
              </View>
              <View className='room-detail-date-item'>
                <Text className='room-detail-date-label'>离店</Text>
                <Text className='room-detail-date-value'>{checkOut || '选择日期'}</Text>
              </View>
              <CalendarOutline className='room-detail-date-icon' />
            </View>
          </View>

          <View className='room-detail-card'>
            <Text className='room-detail-card-title'>价格与优惠</Text>
            <View className='room-detail-row'>
              <Text className='room-detail-label'>到手价</Text>
              <Text className='room-detail-price'>{hasPrice ? `¥${finalPrice}` : '待报价'}</Text>
            </View>
            <View className='room-detail-row'>
              <Text className='room-detail-label'>门市价</Text>
              <Text className='room-detail-value'>{Number.isFinite(basePrice) ? `¥${basePrice}` : '--'}</Text>
            </View>
            {hasRoomDiscount ? (
              <>
                <View className='room-detail-row'>
                  <Text className='room-detail-label'>房型优惠</Text>
                  <Text className='room-detail-discount'>房型专享 {roomDiscountText}</Text>
                </View>
                <View className='room-detail-row'>
                  <Text className='room-detail-label'>有效期</Text>
                  <Text className='room-detail-value room-detail-period'>{formatPeriodLabel(room?.discount_periods)}</Text>
                </View>
              </>
            ) : null}
            {activePromotions.length > 0 ? (
              <View className='room-detail-row'>
                <Text className='room-detail-label'>酒店活动</Text>
                <Text className='room-detail-value room-detail-period'>
                  {activePromotions.map((promo) => {
                    const { name, discount } = getPromotionDisplay(promo)
                    return `${name} ${discount}`
                  }).filter(Boolean).join('、')}
                </Text>
              </View>
            ) : null}
            {!hasRoomDiscount && activePromotions.length === 0 ? (
              <View className='room-detail-row'>
                <Text className='room-detail-label'>优惠信息</Text>
                <Text className='room-detail-value'>当前无活动优惠</Text>
              </View>
            ) : (
              null
            )}
          </View>

          <View className='room-detail-card'>
            <Text className='room-detail-card-title'>房型参数</Text>
            <View className='room-detail-row'>
              <Text className='room-detail-label'>基础描述</Text>
              <Text className='room-detail-value room-detail-period'>{getRoomMeta(room)}</Text>
            </View>
            <View className='room-detail-row'>
              <Text className='room-detail-label'>是否含早</Text>
              <Text className='room-detail-value'>{room?.breakfast || room?.breakfast_included ? '是' : '否'}</Text>
            </View>
            <View className='room-detail-row'>
              <Text className='room-detail-label'>可取消</Text>
              <Text className='room-detail-value'>{room?.cancelable ? '支持免费取消' : '不可取消'}</Text>
            </View>
            <View className='room-detail-row'>
              <Text className='room-detail-label'>WiFi</Text>
              <Text className='room-detail-value'>{room?.wifi ? '提供' : '未标注'}</Text>
            </View>
          </View>

          <View className='room-detail-bottom-space' />
        </View>
      </ScrollView>

      <BookingBottomBar
        price={hasPrice ? finalPrice : undefined}
        priceSuffix='每晚'
        loading={booking}
        actionText={soldOut ? '已售罄' : '立即预订'}
        disabled={booking || soldOut}
        actionClassName='room-detail-book-btn'
        onAction={handleBook}
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
