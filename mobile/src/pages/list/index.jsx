import { View, Text } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useState, useRef } from 'react'
import { NavBar, Dropdown, InfiniteScroll, Radio, Checkbox, Button, Empty, SearchBar, Space } from 'antd-mobile'
import { SearchOutline } from 'antd-mobile-icons'
import { api } from '../../services/request'
import HotelCard from '../../components/HotelCard'
import './index.css'

export default function List() {
  const router = useRouter()
  const params = router.params || {}
  
  // URL Params
  const [city, setCity] = useState(params.city ? decodeURIComponent(params.city) : '')
  const [keyword, setKeyword] = useState(params.keyword ? decodeURIComponent(params.keyword) : '')
  const [checkIn, setCheckIn] = useState(params.checkIn || '')
  const [checkOut, setCheckOut] = useState(params.checkOut || '')
  const [minPrice, setMinPrice] = useState(params.minPrice || '')
  const [maxPrice, setMaxPrice] = useState(params.maxPrice || '')

  // Data State
  const [list, setList] = useState([])
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  
  // Filter State
  const [sort, setSort] = useState('recommend') // recommend, price_asc, price_desc, star
  const [selectedStars, setSelectedStars] = useState(params.stars ? params.stars.split(',') : [])
  
  const dropdownRef = useRef(null)
  const isFirstLoad = useRef(true)

  // Fetch Data
  async function loadMore() {
    try {
      const nextPage = page
      const queryParams = new URLSearchParams()
      if (city) queryParams.append('city', city)
      if (keyword) queryParams.append('keyword', keyword)
      if (checkIn) queryParams.append('checkIn', checkIn)
      if (checkOut) queryParams.append('checkOut', checkOut)
      if (minPrice) queryParams.append('minPrice', minPrice)
      if (maxPrice) queryParams.append('maxPrice', maxPrice)
      if (sort) queryParams.append('sort', sort)
      if (selectedStars.length > 0) queryParams.append('stars', selectedStars.join(','))
      
      queryParams.append('page', nextPage)
      queryParams.append('pageSize', 10)

      const res = await api.get(`/api/hotels?${queryParams.toString()}`)
      
      if (res && res.list) {
        setList(prev => nextPage === 1 ? res.list : [...prev, ...res.list])
        setHasMore(res.list.length >= 10)
        setPage(nextPage + 1)
      } else {
        setHasMore(false)
      }
    } catch (e) {
      console.error(e)
      setHasMore(false)
    }
  }

  // Reset and Reload when filters change
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false
      return
    }
    setPage(1)
    setList([])
    setHasMore(true)
    // InfiniteScroll will trigger loadMore automatically when hasMore is true and content is short, 
    // but we need to reset page state carefully. 
    // Actually, setting hasMore=true and list=[] usually triggers InfiniteScroll.
    // However, to be safe and avoid double fetch or no fetch, we can manually call loadMore(1) if we managed the state manually,
    // but with InfiniteScroll component, we just reset state.
  }, [sort, selectedStars, city, keyword, minPrice, maxPrice]) // checkIn/checkOut usually don't change in list page interaction unless we add date picker

  // Handle Search Bar Click -> Go back to search or expand
  const handleSearchClick = () => {
    Taro.navigateBack()
  }

  return (
    <View className="list-page">
      {/* Custom Header */}
      <View className="list-header-wrapper">
        <NavBar 
          onBack={() => Taro.navigateBack()}
          className="list-navbar"
          backArrow={<View className="nav-back-icon">‹</View>}
        >
          <View className="header-search-box" onClick={handleSearchClick}>
            <SearchOutline className="search-icon" />
            <Text className="search-text">
              {city} · {keyword || '搜索酒店'}
            </Text>
            <Text className="search-date">
              {checkIn && checkOut ? `${checkIn.slice(5).replace('-','/')} - ${checkOut.slice(5).replace('-','/')}` : ''}
            </Text>
          </View>
        </NavBar>

        {/* Filter Bar */}
        <Dropdown ref={dropdownRef} className="filter-dropdown">
          <Dropdown.Item key="sort" title={
            sort === 'recommend' ? '推荐排序' : 
            sort === 'price_asc' ? '价格低→高' : 
            sort === 'price_desc' ? '价格高→低' : 
            sort === 'star' ? '星级高→低' : '排序'
          }>
            <View className="dropdown-content">
              <Radio.Group value={sort} onChange={(val) => {
                setSort(val)
                dropdownRef.current?.close()
              }}>
                <Space direction='vertical' block>
                  <Radio value='recommend'>推荐排序</Radio>
                  <Radio value='price_asc'>价格低到高</Radio>
                  <Radio value='price_desc'>价格高到低</Radio>
                  <Radio value='star'>星级高到低</Radio>
                </Space>
              </Radio.Group>
            </View>
          </Dropdown.Item>

          <Dropdown.Item key="price" title={
            (minPrice || maxPrice) ? '价格(已选)' : '价格范围'
          }>
            <View className="dropdown-content">
              <Radio.Group 
                value={
                  minPrice === '1000' && !maxPrice ? '1000+' :
                  minPrice && maxPrice ? `${minPrice}-${maxPrice}` : 
                  'unlimited'
                }
                onChange={(val) => {
                  if (val === 'unlimited') {
                    setMinPrice('')
                    setMaxPrice('')
                  } else if (val === '1000+') {
                    setMinPrice('1000')
                    setMaxPrice('')
                  } else {
                    const [min, max] = val.split('-')
                    setMinPrice(min)
                    setMaxPrice(max)
                  }
                  dropdownRef.current?.close()
                }}
              >
                <Space direction='vertical' block>
                  <Radio value='unlimited'>不限</Radio>
                  <Radio value='0-150'>¥150以下</Radio>
                  <Radio value='150-300'>¥150-300</Radio>
                  <Radio value='300-450'>¥300-450</Radio>
                  <Radio value='450-600'>¥450-600</Radio>
                  <Radio value='600-1000'>¥600-1000</Radio>
                  <Radio value='1000+'>¥1000以上</Radio>
                </Space>
              </Radio.Group>
            </View>
          </Dropdown.Item>
          
          <Dropdown.Item key="filter" title={selectedStars.length ? `星级(${selectedStars.length})` : '星级筛选'}>
            <View className="dropdown-content">
              <View className="filter-section-title">星级</View>
              <Checkbox.Group value={selectedStars} onChange={val => setSelectedStars(val)}>
                <Space direction='vertical' block>
                  <Checkbox value='3'>三星级</Checkbox>
                  <Checkbox value='4'>四星级</Checkbox>
                  <Checkbox value='5'>五星级</Checkbox>
                </Space>
              </Checkbox.Group>
              <Button 
                block 
                color='primary' 
                style={{ marginTop: 16 }}
                onClick={() => dropdownRef.current?.close()}
              >
                确定
              </Button>
            </View>
          </Dropdown.Item>
        </Dropdown>
      </View>

      {/* List Content */}
      <View className="list-content">
        {list.map(hotel => (
          <HotelCard 
            key={hotel.id} 
            hotel={hotel} 
            onClick={() => Taro.navigateTo({
              url: `/pages/detail/index?id=${hotel.id}&checkIn=${checkIn}&checkOut=${checkOut}`
            })} 
          />
        ))}
        
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
        
        {!hasMore && list.length === 0 && (
          <Empty description="暂无符合条件的酒店" />
        )}
      </View>
    </View>
  )
}
