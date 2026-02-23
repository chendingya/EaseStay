import { View, Image, Text } from '@tarojs/components'
import { useEffect, useState } from 'react'
import { RightOutline } from 'antd-mobile-icons'
import { resolveImageUrl } from '../../services/request'
import './index.css'

export default function HotelCard({ hotel, onClick, badgeText, extraMetaItems = [] }) {
  const imageSrc = (Array.isArray(hotel.images) && hotel.images[0]) || hotel.cover_image || ''
  const optimizedImageSrc = resolveImageUrl(imageSrc, { width: 112, height: 132, quality: 70 })
  const [imageFailed, setImageFailed] = useState(false)
  const openingYear = hotel.opening_time ? String(hotel.opening_time).slice(0, 4) : ''
  const facilities = Array.isArray(hotel.facilities) ? hotel.facilities.slice(0, 2) : []
  const hotelName = hotel?.name || hotel?.name_en || `酒店 #${hotel?.id ?? '--'}`
  const address = `${hotel?.city || ''} ${hotel?.address || ''}`.trim() || '地址信息待完善'
  const starCount = Math.max(0, Math.min(5, Number(hotel?.star_rating) || 0))
  const metaItems = [
    openingYear ? `${openingYear}年开业` : '',
    ...extraMetaItems
  ].filter(Boolean)
  const displayPrice = Number(hotel?.lowestPrice)
  const hasPrice = Number.isFinite(displayPrice)

  useEffect(() => {
    setImageFailed(false)
  }, [imageSrc])

  return (
    <View
      onClick={onClick}
      className='hotel-card'
    >
      <View className="hotel-card-main">
        {imageSrc && !imageFailed ? (
          <Image
            src={optimizedImageSrc}
            mode="aspectFill"
            className="hotel-card-image"
            width={112}
            height={132}
            lazyLoad
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View className="hotel-card-image hotel-card-image-placeholder" />
        )}
        <View className="hotel-card-info">
          <View className="hotel-card-title-row">
            <Text className="hotel-card-name">{hotelName}</Text>
            {badgeText ? (
              <View className="hotel-card-badge">
                <Text className="hotel-card-badge-text">{badgeText}</Text>
              </View>
            ) : null}
            {starCount > 0 ? (
              <View className="hotel-card-star">
                <Text className="hotel-card-star-text">{'★'.repeat(starCount)}</Text>
              </View>
            ) : null}
          </View>
          {hotel?.name_en ? (
            <Text className="hotel-card-name-en">{hotel.name_en}</Text>
          ) : null}
          <Text className="hotel-card-address">{address}</Text>
          <View className="hotel-card-meta">
            {metaItems.map((item, idx) => (
              <Text key={`${item}-${idx}`} className="hotel-card-meta-item">{item}</Text>
            ))}
          </View>
          {facilities.length > 0 ? (
            <View className="hotel-card-tags">
              {facilities.map((item) => (
                <Text key={item} className="hotel-card-tag">{item}</Text>
              ))}
            </View>
          ) : null}
          <View className="hotel-card-bottom">
            <View className="hotel-card-price">
              {hasPrice ? (
                <>
                  <Text className="hotel-card-price-symbol">¥</Text>
                  <Text className="hotel-card-price-value">{displayPrice}</Text>
                  <Text className="hotel-card-price-suffix"> 起</Text>
                </>
              ) : (
                <Text className="hotel-card-price-empty">暂无房型</Text>
              )}
            </View>
            <View className="hotel-card-open">
              <Text className="hotel-card-open-text">查看详情</Text>
              <RightOutline className="hotel-card-open-icon" />
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}
