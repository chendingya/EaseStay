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
              <Text className="hotel-score">4.8分</Text>
            </View>
            <View className="hotel-price">
               <Text className="price-symbol">¥</Text>
               <Text className="price-value">{hotel.lowestPrice}</Text>
               <Text className="price-suffix"> 起</Text>
            </View>
         </View>
      </View>
    </Card>
  )
}