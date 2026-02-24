import { memo, useEffect, useMemo, useState } from 'react'
import { View, Image, Text } from '@tarojs/components'
import { RightOutline } from 'antd-mobile-icons'
import { resolveImageUrl } from '../../services/request'
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

function RoomTypeCard({
  room,
  onBook,
  onOpen,
  booking = false,
  metaResolver
}) {
  const imageSrc = (Array.isArray(room?.images) && room.images[0]) || room?.image || ''
  const optimizedImageSrc = resolveImageUrl(imageSrc, { width: 84, height: 84, quality: 70 })
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

  const finalPrice = Number(room?.display_price)
  const basePrice = Number(room?.base_price)
  const hasPrice = Number.isFinite(finalPrice)
  const hasDiscount = hasPrice && Number.isFinite(basePrice) && finalPrice < basePrice
  const discountLabel = room?.room_discount_label || ''
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
          src={optimizedImageSrc}
          mode='aspectFill'
          alt={room?.name || '房型图片'}
          width={84}
          height={84}
          lazyLoad
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
          {hasPrice ? (
            <View className='room-type-card-price'>
              <Text className='room-type-card-price-symbol'>¥</Text>
              <Text className='room-type-card-price-value'>{finalPrice}</Text>
            </View>
          ) : (
            <Text className='room-type-card-origin'>待报价</Text>
          )}
          {hasDiscount ? (
            <>
              <Text className='room-type-card-origin'>¥{basePrice}</Text>
              {discountLabel ? <Text className='room-type-card-discount'>{discountLabel}</Text> : null}
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
