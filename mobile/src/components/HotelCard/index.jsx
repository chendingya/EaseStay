import { View, Image, Text } from '@tarojs/components'
import { RightOutline } from 'antd-mobile-icons'
import './index.css'

export default function HotelCard({ hotel, onClick, index, animate = false }) {
  const imageSrc = (Array.isArray(hotel.images) && hotel.images[0]) || hotel.cover_image || ''
  const openingYear = hotel.opening_time ? String(hotel.opening_time).slice(0, 4) : ''
  const facilities = Array.isArray(hotel.facilities) ? hotel.facilities.slice(0, 2) : []
  const delay = animate && Number.isFinite(index) ? `${Math.min(index, 10) * 20}ms` : '0ms'
  const hotelName = hotel?.name || hotel?.name_en || `酒店 #${hotel?.id ?? '--'}`
  const address = `${hotel?.city || ''} ${hotel?.address || ''}`.trim() || '地址信息待完善'

  return (
    <View
      onClick={onClick}
      className={`hotel-card ${animate ? 'stagger-enter' : ''}`}
      style={animate ? { animationDelay: delay } : undefined}
    >
      <View className="hotel-card-main">
        {imageSrc ? (
          <Image src={imageSrc} mode="aspectFill" className="hotel-card-image" />
        ) : (
          <View className="hotel-card-image hotel-card-image-placeholder" />
        )}
        <View className="hotel-card-info">
          <View className="hotel-card-title-row">
            <Text className="hotel-card-name">{hotelName}</Text>
            {hotel?.star_rating ? (
              <View className="hotel-card-star">
                <Text className="hotel-card-star-text">{hotel.star_rating}星</Text>
              </View>
            ) : null}
          </View>
          {hotel?.name_en ? (
            <Text className="hotel-card-name-en">{hotel.name_en}</Text>
          ) : null}
          <Text className="hotel-card-address">{address}</Text>
          <View className="hotel-card-meta">
            <Text className="hotel-card-meta-item">{hotel?.star_rating ? `${hotel.star_rating}星级` : '暂无评级'}</Text>
            {openingYear ? <Text className="hotel-card-meta-item">{openingYear}年开业</Text> : null}
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
              {hotel.lowestPrice ? (
                <>
                  <Text className="hotel-card-price-symbol">¥</Text>
                  <Text className="hotel-card-price-value">{hotel.lowestPrice}</Text>
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
