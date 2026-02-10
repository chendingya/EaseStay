import { View, Image, Text } from '@tarojs/components'
import { Card } from 'antd-mobile'
import './index.css'

export default function HotelCard({ hotel, onClick }) {
  return (
    <Card 
      onClick={onClick} 
      className="hotel-card"
    >
      <View className="hotel-card-content">
         {hotel.images && hotel.images[0] ? (
           <Image 
             src={hotel.images[0]} 
             mode="aspectFill" 
             className="hotel-image"
           />
         ) : (
           <View className="hotel-image-placeholder" />
         )}
         <View className="hotel-info">
            <View className="hotel-name">{hotel.name}</View>
            <View className="hotel-meta">
              <Text>{hotel.city}</Text>
              <Text className="hotel-score">
                {hotel.star_rating ? `${hotel.star_rating}星` : '暂无评级'}
              </Text>
            </View>
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