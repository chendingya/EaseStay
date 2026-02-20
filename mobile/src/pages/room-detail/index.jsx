import { useEffect, useMemo, useState } from 'react'
import { View, Text, Image, ScrollView, Swiper, SwiperItem } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { CalendarPicker } from 'antd-mobile'
import { CalendarOutline } from 'antd-mobile-icons'
import { api } from '../../services/request'
import PageTopBar from '../../components/PageTopBar'
import BookingBottomBar from '../../components/BookingBottomBar'
import { formatDate, parseLocalDate, resolveDateRange } from '../../utils/dateRange'
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

const getRoomMeta = (room) => {
  const meta = []
  if (Number(room?.area) > 0) meta.push(`${room.area}㎡`)
  if (Number(room?.bed_width) > 0) meta.push(`床宽${room.bed_width}m`)
  if (Number(room?.capacity) > 0) meta.push(`可住${room.capacity}人`)
  if (Number(room?.ceiling_height) > 0) meta.push(`层高${room.ceiling_height}m`)
  return meta.length > 0 ? meta.join(' · ') : '以酒店实际安排为准'
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

  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [hotel, setHotel] = useState(null)
  const [room, setRoom] = useState(null)
  const [bannerImageError, setBannerImageError] = useState({})
  const [navOpacity, setNavOpacity] = useState(0)
  const [calendarVisible, setCalendarVisible] = useState(false)

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
          <Swiper className='room-banner-swiper' indicatorDots indicatorColor='rgba(255,255,255,0.5)' indicatorActiveColor='#fff'>
            {images.length > 0 ? images.map((img, idx) => (
              <SwiperItem key={`${img}-${idx}`}>
                {img && !bannerImageError[idx] ? (
                  <Image
                    className='room-banner-image'
                    src={img}
                    mode='aspectFill'
                    onError={() => setBannerImageError((prev) => ({ ...prev, [idx]: true }))}
                  />
                ) : (
                  <View className='room-banner-placeholder'>
                    <Text className='room-banner-placeholder-text'>暂无图片</Text>
                  </View>
                )}
              </SwiperItem>
            )) : (
              <SwiperItem key='empty'>
                <View className='room-banner-placeholder'>
                  <Text className='room-banner-placeholder-text'>暂无图片</Text>
                </View>
              </SwiperItem>
            )}
          </Swiper>
          <View className='room-banner-count'>{images.length || 1} 张</View>
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
                  <Text className='room-detail-label'>优惠力度</Text>
                  <Text className='room-detail-discount'>{discountLabel}</Text>
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
                  {activePromotions.map((promo) => promo?.title || promo?.type || '活动优惠').filter(Boolean).join('、')}
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
              <Text className='room-detail-label'>可售数量</Text>
              <Text className='room-detail-value'>{Number(room?.available_count) || 0}</Text>
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
        actionClassName='room-detail-book-btn'
        onAction={handleBook}
      />

      <CalendarPicker
        selectionMode='range'
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        onConfirm={handleDateConfirm}
        defaultValue={[parseLocalDate(checkIn), parseLocalDate(checkOut)]}
      />
    </View>
  )
}
