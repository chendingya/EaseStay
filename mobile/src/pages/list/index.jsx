import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useState, useCallback } from 'react'
import './index.css'

const API_BASE = 'http://127.0.0.1:4100'

// 排序选项
const sortOptions = [
  { value: 'recommend', label: '推荐' },
  { value: 'price_asc', label: '价格↑' },
  { value: 'price_desc', label: '价格↓' },
  { value: 'star', label: '星级' },
]

// 快捷筛选
const filterTags = ['不限', '五星', '四星', '亲子', '含早', '免费停车']

export default function List() {
  const router = useRouter()
  const { city = '', keyword = '', checkIn = '', checkOut = '' } = router.params || {}
  
  const [hotels, setHotels] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [total, setTotal] = useState(0)
  const [sort, setSort] = useState('recommend')
  const [activeFilter, setActiveFilter] = useState('不限')

  const fetchHotels = useCallback(async (pageNum = 1, append = false) => {
    if (loading) return
    setLoading(true)
    
    try {
      const params = new URLSearchParams()
      if (city) params.append('city', city)
      if (keyword) params.append('keyword', keyword)
      if (checkIn) params.append('checkIn', checkIn)
      if (checkOut) params.append('checkOut', checkOut)
      if (sort) params.append('sort', sort)
      params.append('page', pageNum)
      params.append('pageSize', 10)

      const res = await Taro.request({
        url: `${API_BASE}/api/hotels?${params.toString()}`,
        method: 'GET'
      })
      
      if (res.data) {
        const { list = [], total: t = 0 } = res.data
        setTotal(t)
        setHotels((prev) => append ? [...prev, ...list] : list)
        setHasMore(list.length === 10)
        setPage(pageNum)
      }
    } catch (err) {
      console.error('获取酒店列表失败', err)
      Taro.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [city, keyword, checkIn, checkOut, sort, loading])

  useEffect(() => {
    setPage(1)
    setHotels([])
    fetchHotels(1, false)
  }, [sort, city, keyword, checkIn, checkOut, fetchHotels])

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      fetchHotels(page + 1, true)
    }
  }

  const handleHotelClick = (id) => {
    Taro.navigateTo({
      url: `/pages/detail/index?id=${id}&checkIn=${checkIn}&checkOut=${checkOut}`
    })
  }

  const handleSortChange = (value) => {
    setSort(value)
    setPage(1)
    setHotels([])
  }

  const nights = () => {
    if (!checkIn || !checkOut) return 1
    const diff = (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
    return Math.max(1, diff)
  }

  const applyFilter = (list) => {
    if (activeFilter === '不限') return list
    if (activeFilter === '五星' || activeFilter === '四星') {
      const target = activeFilter === '五星' ? 5 : 4
      return list.filter((hotel) => Number(hotel.star_rating) === target)
    }
    if (activeFilter === '含早') {
      return list.filter((hotel) => {
        const facilities = hotel.facilities || []
        return facilities.includes('含早') || facilities.includes('早餐') || facilities.includes('含早餐')
      })
    }
    if (activeFilter === '免费停车') {
      return list.filter((hotel) => {
        const facilities = hotel.facilities || []
        return facilities.includes('免费停车') || facilities.includes('停车场')
      })
    }
    return list.filter((hotel) => {
      const facilities = hotel.facilities || []
      return facilities.includes(activeFilter) || hotel.name?.includes(activeFilter) || hotel.name_en?.includes(activeFilter)
    })
  }

  const applySort = (list) => {
    if (sort === 'price_asc') {
      return [...list].sort((a, b) => (Number(a.lowestPrice) || 0) - (Number(b.lowestPrice) || 0))
    }
    if (sort === 'price_desc') {
      return [...list].sort((a, b) => (Number(b.lowestPrice) || 0) - (Number(a.lowestPrice) || 0))
    }
    if (sort === 'star') {
      return [...list].sort((a, b) => (Number(b.star_rating) || 0) - (Number(a.star_rating) || 0))
    }
    return list
  }

  const displayHotels = applySort(applyFilter(hotels))

  return (
    <View className="list-page">
      {/* 日期和城市信息 */}
      <View className="list-header glass-card">
        <View className="header-info">
          <Text className="header-city">{city || '全部城市'}</Text>
          <Text className="header-date">{checkIn || '选择日期'} - {checkOut || '选择日期'} · {nights()}晚</Text>
        </View>
        {keyword && <Text className="header-keyword">"{keyword}"</Text>}
      </View>

      {/* 排序和筛选 */}
      <View className="filter-bar">
        <View className="sort-tabs">
          {sortOptions.map(opt => (
            <View
              key={opt.value}
              className={`sort-tab ${sort === opt.value ? 'active' : ''}`}
              onClick={() => handleSortChange(opt.value)}
            >
              {opt.label}
            </View>
          ))}
        </View>
        <ScrollView scrollX className="filter-scroll">
          {filterTags.map((tag, idx) => (
            <View
              key={idx}
              className={`filter-tag ${activeFilter === tag ? 'active' : ''}`}
              onClick={() => setActiveFilter(tag)}
            >
              {tag}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* 酒店列表 */}
      <ScrollView
        scrollY
        className="hotel-list"
        onScrollToLower={handleLoadMore}
        lowerThreshold={100}
      >
        {displayHotels.map(hotel => (
          <View key={hotel.id} className="hotel-card glass-card" onClick={() => handleHotelClick(hotel.id)}>
            <View className="hotel-img-wrap">
              {hotel.images && hotel.images[0] ? (
                <Image className="hotel-img" src={hotel.images[0]} mode="aspectFill" />
              ) : (
                <View className="hotel-img-placeholder" />
              )}
              {hotel.star_rating && (
                <View className="hotel-star">{hotel.star_rating}星</View>
              )}
            </View>
            <View className="hotel-info">
              <Text className="hotel-name">{hotel.name}</Text>
              {hotel.name_en && <Text className="hotel-name-en">{hotel.name_en}</Text>}
              <View className="hotel-meta">
                <Text className="hotel-city">{hotel.city}</Text>
                {hotel.opening_time && <Text className="hotel-opening">· {hotel.opening_time.split('-')[0]}年开业</Text>}
              </View>
              {hotel.facilities && hotel.facilities.length > 0 && (
                <View className="hotel-tags">
                  {hotel.facilities.slice(0, 3).map((f, i) => (
                    <Text key={i} className="hotel-tag">{f}</Text>
                  ))}
                </View>
              )}
              <View className="hotel-bottom">
                {hotel.lowestPrice ? (
                  <View className="hotel-price">
                    <Text className="price-symbol">¥</Text>
                    <Text className="price-num">{hotel.lowestPrice}</Text>
                    <Text className="price-unit">起</Text>
                  </View>
                ) : (
                  <Text className="price-empty">暂无报价</Text>
                )}
              </View>
            </View>
          </View>
        ))}

        {/* 加载状态 */}
        {loading && (
          <View className="loading-tip">加载中...</View>
        )}
        {!loading && !hasMore && hotels.length > 0 && (
          <View className="loading-tip">没有更多了</View>
        )}
        {!loading && displayHotels.length === 0 && (
          <View className="empty-tip">暂无酒店数据</View>
        )}
      </ScrollView>
    </View>
  )
}
