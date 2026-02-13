import { useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { Empty, Dialog, Button } from 'antd-mobile'
import { DeleteOutline } from 'antd-mobile-icons'
import PageTopBar from '../../components/PageTopBar'
import FavoriteHotelList from '../../components/FavoriteHotelList'
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
    const next = getFavoriteHotels()
      .slice()
      .sort((a, b) => {
        const ta = new Date(a?.savedAt || 0).getTime()
        const tb = new Date(b?.savedAt || 0).getTime()
        return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0)
      })
    setList(next)
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

  const clearFavorites = async () => {
    const result = await Dialog.confirm({
      content: '确认清空全部收藏酒店吗？'
    }).catch(() => false)
    if (!result) return
    saveFavoriteHotels([])
    setList([])
  }

  const goExplore = () => {
    Taro.reLaunch({ url: '/pages/index/index' })
  }

  return (
    <View className='favorites-page'>
      <PageTopBar
        title='收藏'
        showBack
        rightActions={list.length > 0
          ? [{
              key: 'clear',
              icon: <DeleteOutline className='favorites-clear-icon' />,
              onClick: clearFavorites
            }]
          : []}
      />

      <View className='favorites-content'>
        {list.length === 0 ? (
          <View className='favorites-empty-card'>
            <Empty description='暂无收藏酒店' />
            <View className='favorites-empty-action'>
              <Button color='primary' size='small' onClick={goExplore}>
                去逛逛酒店
              </Button>
            </View>
          </View>
        ) : (
          <View className='favorites-list-wrap'>
            <FavoriteHotelList
              list={list}
              onOpen={openHotel}
              onRemove={removeFavorite}
            />
            <View className='favorites-footer'>
              <Text className='favorites-footer-text'>已展示全部收藏酒店</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  )
}
