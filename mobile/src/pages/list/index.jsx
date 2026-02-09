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
  // Use a ref to ensure we parse params only once and correctly on mount
  const paramsRef = useRef(router.params || {})
  
  // URL Params - use safe decoding
  const safeDecode = (str) => {
    if (!str) return ''
    try {
      return decodeURIComponent(str)
    } catch (e) {
      return str
    }
  }

  const [city, setCity] = useState(() => safeDecode(paramsRef.current.city))
  const [keyword, setKeyword] = useState(() => safeDecode(paramsRef.current.keyword))
  const [checkIn, setCheckIn] = useState(() => paramsRef.current.checkIn || '')
  const [checkOut, setCheckOut] = useState(() => paramsRef.current.checkOut || '')
  const [minPrice, setMinPrice] = useState(() => paramsRef.current.minPrice || '')
  const [maxPrice, setMaxPrice] = useState(() => paramsRef.current.maxPrice || '')

  // Data State
  const [list, setList] = useState([])
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  
  // Filter State
  const [sort, setSort] = useState('recommend') // recommend, price_asc, price_desc, star
  const [selectedStars, setSelectedStars] = useState(() => paramsRef.current.stars ? paramsRef.current.stars.split(',') : [])
  
  const dropdownRef = useRef(null)
  const isFirstLoad = useRef(true)

  // Use refs for current search params to avoid stale closures in loadMore if called async
  const searchParamsRef = useRef({ city, keyword, checkIn, checkOut, minPrice, maxPrice, sort, selectedStars })

  // Sync refs with state
  useEffect(() => {
    searchParamsRef.current = { city, keyword, checkIn, checkOut, minPrice, maxPrice, sort, selectedStars }
  }, [city, keyword, checkIn, checkOut, minPrice, maxPrice, sort, selectedStars])

  // Fetch Data
  async function loadMore() {
    try {
      // Use ref values to ensure latest params
      const currentParams = searchParamsRef.current
      const nextPage = page // Use state page, assuming it's managed correctly with setPage
      
      const queryParams = new URLSearchParams()
      if (currentParams.city) queryParams.append('city', currentParams.city)
      if (currentParams.keyword) queryParams.append('keyword', currentParams.keyword)
      if (currentParams.checkIn) queryParams.append('checkIn', currentParams.checkIn)
      if (currentParams.checkOut) queryParams.append('checkOut', currentParams.checkOut)
      if (currentParams.minPrice) queryParams.append('minPrice', currentParams.minPrice)
      if (currentParams.maxPrice) queryParams.append('maxPrice', currentParams.maxPrice)
      if (currentParams.sort) queryParams.append('sort', currentParams.sort)
      if (currentParams.selectedStars.length > 0) queryParams.append('stars', currentParams.selectedStars.join(','))
      
      queryParams.append('page', nextPage)
      queryParams.append('pageSize', 10)

      console.log('Fetching hotels with params:', queryParams.toString())

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
      // Don't return here! InfiniteScroll might not trigger if content is empty initially?
      // Actually InfiniteScroll usually triggers loadMore on mount if hasMore is true.
      // But let's verify if we need manual trigger.
      // For now, standard InfiniteScroll behavior is enough.
      return
    }
    setPage(1)
    setList([])
    setHasMore(true) // This should trigger InfiniteScroll to call loadMore
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
                  <Checkbox value='0'>未评级</Checkbox>
                  <Checkbox value='1'>一星级</Checkbox>
                  <Checkbox value='2'>二星级</Checkbox>
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
