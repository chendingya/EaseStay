import { View, Text, Image } from '@tarojs/components'
import { RightOutline } from 'antd-mobile-icons'
import GlassButton from '../GlassButton'
import './index.css'

const formatSavedAt = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const formatPrice = (value) => {
  const num = Number(value)
  return Number.isFinite(num) && num > 0 ? Math.round(num * 100) / 100 : null
}

export default function FavoriteHotelCard({ hotel, onOpen, onRemove, index, animate = false }) {
  const imageSrc = (Array.isArray(hotel?.images) && hotel.images[0]) || hotel?.cover_image || ''
  const openingYear = hotel?.opening_time ? String(hotel.opening_time).slice(0, 4) : ''
  const price = formatPrice(hotel?.lowestPrice)
  const savedAt = formatSavedAt(hotel?.savedAt)
  const hotelName = hotel?.name || `酒店 #${hotel?.id ?? '--'}`
  const address = `${hotel?.city || ''} ${hotel?.address || ''}`.trim() || '地址信息待完善'
  const delay = animate && Number.isFinite(index) ? `${Math.min(index, 10) * 20}ms` : '0ms'

  return (
    <View
      className={`favorite-hotel-card ${animate ? 'stagger-enter' : ''}`}
      style={animate ? { animationDelay: delay } : undefined}
    >
      <View className='favorite-hotel-main' onClick={() => onOpen && onOpen(hotel?.id)}>
        {imageSrc ? (
          <Image className='favorite-hotel-image' src={imageSrc} mode='aspectFill' />
        ) : (
          <View className='favorite-hotel-image favorite-hotel-image-placeholder'>
            <Text className='favorite-hotel-image-text'>暂无图片</Text>
          </View>
        )}

        <View className='favorite-hotel-info'>
          <View className='favorite-hotel-title-row'>
            <Text className='favorite-hotel-name'>{hotelName}</Text>
            <View className='favorite-hotel-badge'>
              <Text className='favorite-hotel-badge-text'>已收藏</Text>
            </View>
          </View>

          {hotel?.name_en ? (
            <Text className='favorite-hotel-name-en'>{hotel.name_en}</Text>
          ) : null}

          <Text className='favorite-hotel-address'>{address}</Text>

          <View className='favorite-hotel-meta'>
            <Text className='favorite-hotel-meta-item'>
              {hotel?.star_rating ? `${hotel.star_rating}星级` : '暂无评级'}
            </Text>
            {openingYear ? (
              <Text className='favorite-hotel-meta-item'>{openingYear}年开业</Text>
            ) : null}
            {savedAt ? (
              <Text className='favorite-hotel-meta-item'>收藏于 {savedAt}</Text>
            ) : null}
          </View>

          <View className='favorite-hotel-bottom'>
            <View className='favorite-hotel-price'>
              {price ? (
                <>
                  <Text className='favorite-hotel-price-symbol'>¥</Text>
                  <Text className='favorite-hotel-price-value'>{price}</Text>
                  <Text className='favorite-hotel-price-suffix'> 起</Text>
                </>
              ) : (
                <Text className='favorite-hotel-price-empty'>暂无参考价</Text>
              )}
            </View>

            <View className='favorite-hotel-open'>
              <Text className='favorite-hotel-open-text'>查看详情</Text>
              <RightOutline className='favorite-hotel-open-icon' />
            </View>
          </View>
        </View>
      </View>

      <View className='favorite-hotel-actions'>
        <GlassButton tone='danger' fill='outline' size='small' onClick={() => onRemove && onRemove(hotel?.id)}>
          取消收藏
        </GlassButton>
      </View>
    </View>
  )
}
