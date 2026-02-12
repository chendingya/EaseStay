import { View, Image, Text } from '@tarojs/components'
import { Card } from 'antd-mobile'
import './index.css'

export default function HotelCard({ hotel, onClick }) {
  const imageSrc = (Array.isArray(hotel.images) && hotel.images[0]) || hotel.cover_image || ''
  const openingYear = hotel.opening_time ? String(hotel.opening_time).slice(0, 4) : ''
  const facilities = Array.isArray(hotel.facilities) ? hotel.facilities.slice(0, 2) : []

  return (
    <Card onClick={onClick} className="hotel-card">
      <View className="hotel-card-content">
        {imageSrc ? (
          <Image src={imageSrc} mode="aspectFill" className="hotel-image" />
        ) : (
          <View className="hotel-image-placeholder" />
        )}
        <View className="hotel-info">
          <View>
            <View className="hotel-name">{hotel.name}</View>
            {hotel.name_en ? (
              <View className="hotel-name-en">{hotel.name_en}</View>
            ) : null}
          </View>
          <View className="hotel-address">{hotel.city || ''} {hotel.address || ''}</View>
          <View className="hotel-meta">
            <Text>{hotel.star_rating ? `${hotel.star_rating}星` : '暂无评级'}</Text>
            {openingYear ? <Text className="hotel-open-year">{openingYear}年开业</Text> : null}
          </View>
          {facilities.length > 0 ? (
            <View className="hotel-tags">
              {facilities.map((item) => (
                <Text key={item} className="hotel-tag">{item}</Text>
              ))}
            </View>
          ) : null}
          <View className="hotel-price">
            {hotel.lowestPrice ? (
              <>
                <Text className="price-symbol">¥</Text>
                <Text className="price-value">{hotel.lowestPrice}</Text>
                <Text className="price-suffix"> 起</Text>
              </>
            ) : (
              <Text className="price-none">暂无房型</Text>
            )}
          </View>
        </View>
      </View>
    </Card>
  )
}
