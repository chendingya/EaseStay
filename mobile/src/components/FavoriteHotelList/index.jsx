import { View, Text } from '@tarojs/components'
import FavoriteHotelCard from '../FavoriteHotelCard'
import './index.css'

export default function FavoriteHotelList({ list = [], onOpen, onRemove }) {
  return (
    <View className='favorite-hotel-list'>
      <View className='favorite-hotel-summary'>
        <Text className='favorite-hotel-summary-text'>已收藏 {list.length} 家酒店</Text>
      </View>

      <View className='favorite-hotel-list-body'>
        {list.map((hotel, index) => (
          <FavoriteHotelCard
            key={`${hotel?.id ?? 'unknown'}-${index}`}
            hotel={hotel}
            onOpen={onOpen}
            onRemove={onRemove}
            index={index}
            animate
          />
        ))}
      </View>
    </View>
  )
}
