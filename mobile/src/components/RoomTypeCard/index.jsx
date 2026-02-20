import { memo, useEffect, useMemo, useState } from 'react'
import { View, Image, Text } from '@tarojs/components'
import { RightOutline } from 'antd-mobile-icons'
import './index.css'

const getDefaultMeta = (room) => {
  const meta = []
  if (Number(room?.area) > 0) {
    meta.push(`${room.area}㎡`)
  }
  if (Number(room?.bed_width) > 0) {
    meta.push(`床宽${room.bed_width}m`)
  }
  if (Number(room?.capacity) > 0) {
    meta.push(`可住${room.capacity}人`)
  }
  if (Number(room?.ceiling_height) > 0) {
    meta.push(`层高${room.ceiling_height}m`)
  }
  return meta.length > 0 ? meta.join(' · ') : '以酒店实际安排为准'
}

const getFinalPrice = (room) => {
  const price = Number(room?.price) || 0
  const discount = Number(room?.discount_rate) || 0
  const quota = Number(room?.discount_quota) || 0
  if (quota <= 0 || discount === 0) {
    return Math.round(price * 100) / 100
  }
  if (discount > 0 && discount <= 10) {
    return Math.round(price * (discount / 10) * 100) / 100
  }
  if (discount < 0) {
    return Math.round(Math.max(0, price + discount) * 100) / 100
  }
  return Math.round(price * 100) / 100
}

const getDiscountLabel = (room) => {
  const discount = Number(room?.discount_rate) || 0
  const quota = Number(room?.discount_quota) || 0
  if (quota <= 0 || discount === 0) return ''
  if (discount < 0) return `减¥${Math.abs(discount)}`
  if (discount > 0 && discount <= 10) return `${discount}折`
  return ''
}

function RoomTypeCard({
  room,
  onBook,
  onOpen,
  booking = false,
  priceResolver,
  metaResolver
}) {
  const imageSrc = (Array.isArray(room?.images) && room.images[0]) || room?.image || ''
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [imageSrc, room?.id])

  const meta = useMemo(() => {
    if (typeof metaResolver === 'function') {
      return metaResolver(room)
    }
    return getDefaultMeta(room)
  }, [metaResolver, room])

  const finalPrice = useMemo(() => {
    const val = typeof priceResolver === 'function' ? priceResolver(room) : getFinalPrice(room)
    const num = Number(val)
    if (!Number.isFinite(num)) return 0
    return Math.round(num * 100) / 100
  }, [priceResolver, room])

  const discountLabel = getDiscountLabel(room)
  const hasDiscount = Boolean(discountLabel)
  const tags = [
    room?.breakfast || room?.breakfast_included ? '含早' : '',
    room?.cancelable ? '免费取消' : '',
    room?.wifi ? '免费WiFi' : ''
  ].filter(Boolean)

  return (
    <View className='room-type-card' onClick={() => onOpen && onOpen()}>
      {imageSrc && !imageFailed ? (
        <Image
          className='room-type-card-image'
          src={imageSrc}
          mode='aspectFill'
          onError={() => setImageFailed(true)}
        />
      ) : (
        <View className='room-type-card-image room-type-card-image-placeholder' />
      )}

      <View className='room-type-card-main'>
        <Text className='room-type-card-name'>{room?.name || '标准房型'}</Text>

        {tags.length > 0 ? (
          <View className='room-type-card-tags'>
            {tags.map((tag) => (
              <Text key={tag} className='room-type-card-tag'>{tag}</Text>
            ))}
          </View>
        ) : null}

        <Text className='room-type-card-meta'>{meta}</Text>

        <View className='room-type-card-open'>
          <Text className='room-type-card-open-text'>查看详情</Text>
          <RightOutline className='room-type-card-open-icon' />
        </View>
      </View>

      <View className='room-type-card-side'>
        <View className='room-type-card-price-wrap'>
          <View className='room-type-card-price'>
            <Text className='room-type-card-price-symbol'>¥</Text>
            <Text className='room-type-card-price-value'>{finalPrice}</Text>
          </View>
          {hasDiscount ? (
            <>
              <Text className='room-type-card-origin'>¥{Number(room?.price) || 0}</Text>
              <Text className='room-type-card-discount'>{discountLabel}</Text>
            </>
          ) : null}
        </View>

        <View
          className={`room-type-card-book-btn${booking ? ' is-loading' : ''}`}
          onClick={(event) => {
            event?.stopPropagation?.()
            if (!booking && onBook) {
              onBook()
            }
          }}
        >
          <Text className='room-type-card-book-text'>{booking ? '预订中' : '预订'}</Text>
        </View>
      </View>
    </View>
  )
}

export default memo(RoomTypeCard)
