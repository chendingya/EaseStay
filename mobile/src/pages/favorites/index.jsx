import { useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { Empty, Dialog, Button } from 'antd-mobile'
import { DeleteOutline } from 'antd-mobile-icons'
import PageTopBar from '../../components/PageTopBar'
import { createListByType } from '../../components/OrderList'
import { clearFavoriteHotels, getFavoriteHotels, removeFavoriteHotel } from '../../services/favorites'
import { resolveDateRange } from '../../utils/dateRange'
import './index.css'

export default function Favorites() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    try {
      const next = await getFavoriteHotels()
      const sorted = next
        .slice()
        .sort((a, b) => {
          const ta = new Date(a?.savedAt || 0).getTime()
          const tb = new Date(b?.savedAt || 0).getTime()
          return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0)
        })
      setList(sorted)
    } catch (error) {
      setList([])
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    refresh()
  })

  const openHotel = (id) => {
    const SEARCH_STORAGE_KEY = 'hotel_search_params'
    const storedParams = Taro.getStorageSync(SEARCH_STORAGE_KEY) || {}
    const range = resolveDateRange({
      checkIn: storedParams.checkIn,
      checkOut: storedParams.checkOut
    })
    const checkIn = range.checkIn
    const checkOut = range.checkOut
    Taro.navigateTo({
      url: `/pages/detail/index?id=${id}&checkIn=${checkIn}&checkOut=${checkOut}`
    })
  }

  const removeFavorite = async (id) => {
    const result = await Dialog.confirm({
      content: '确认取消收藏该酒店吗？'
    }).catch(() => false)
    if (!result) return
    await removeFavoriteHotel(id)
    await refresh()
  }

  const clearFavorites = async () => {
    const result = await Dialog.confirm({
      content: '确认清空全部收藏酒店吗？'
    }).catch(() => false)
    if (!result) return
    await clearFavoriteHotels()
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
            {createListByType({
              type: 'favorite',
              items: list,
              loading,
              onOpen: openHotel,
              onRemove: removeFavorite,
              badgeText: '已收藏',
              footer: null,
              extraMetaItemsResolver: (hotel) => {
                if (!hotel?.savedAt) return []
                const date = new Date(hotel.savedAt)
                if (Number.isNaN(date.getTime())) return []
                const pad = (n) => String(n).padStart(2, '0')
                const savedAt = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
                return [`收藏于 ${savedAt}`]
              }
            })}
          </View>
        )}
      </View>
    </View>
  )
}
