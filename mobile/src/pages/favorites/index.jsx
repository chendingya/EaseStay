import { useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { Empty, Dialog } from 'antd-mobile'
import HotelCard from '../../components/HotelCard'
import { getFavoriteHotels, saveFavoriteHotels } from '../../services/favorites'
import './index.css'

const formatDate = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function Favorites() {
  const [list, setList] = useState([])

  const refresh = () => {
    setList(getFavoriteHotels())
  }

  useDidShow(() => {
    refresh()
  })

  const openHotel = (id) => {
    const today = new Date()
    const checkIn = formatDate(today)
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    const checkOut = formatDate(tomorrow)
    Taro.navigateTo({
      url: `/pages/detail/index?id=${id}&checkIn=${checkIn}&checkOut=${checkOut}`
    })
  }

  const removeFavorite = async (id) => {
    const result = await Dialog.confirm({
      content: '确认取消收藏该酒店吗？'
    }).catch(() => false)
    if (!result) return
    const next = list.filter((item) => String(item.id) !== String(id))
    saveFavoriteHotels(next)
    setList(next)
  }

  return (
    <View className='favorites-page'>
      {list.length === 0 ? (
        <Empty description='暂无收藏酒店' />
      ) : (
        <View className='favorites-list'>
          {list.map((hotel) => (
            <View className='favorite-card' key={hotel.id}>
              <HotelCard hotel={hotel} onClick={() => openHotel(hotel.id)} />
              <View className='favorite-remove' onClick={() => removeFavorite(hotel.id)}>
                <Text>取消收藏</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
