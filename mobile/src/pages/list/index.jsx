import { View, Text } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useState, useRef } from 'react'
import { Dropdown, Radio, Checkbox, Button, Space, CalendarPicker, Popup, SearchBar, Cascader, Slider, Tag } from 'antd-mobile'
import { SearchOutline, CalendarOutline } from 'antd-mobile-icons'
import { api } from '../../services/request'
import { createListByType } from '../../components/OrderList'
import PageTopBar from '../../components/PageTopBar'
import { cityData } from '../../utils/cityData'
import './index.css'

export default function List() {
  const router = useRouter()
  const SEARCH_STORAGE_KEY = 'hotel_search_params'
  const storedParams = Taro.getStorageSync(SEARCH_STORAGE_KEY) || {}
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

  const formatDate = (date) => {
    if (!date || Number.isNaN(date.getTime())) return ''
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const getDefaultDates = () => {
    const today = new Date()
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    return { checkIn: formatDate(today), checkOut: formatDate(tomorrow) }
  }

  const defaultDates = getDefaultDates()
  const hasKeywordParam = Object.prototype.hasOwnProperty.call(paramsRef.current, 'keyword')
  const [city, setCity] = useState(() => safeDecode(paramsRef.current.city) || storedParams.city || '')
  const [keyword, setKeyword] = useState(() => (hasKeywordParam ? safeDecode(paramsRef.current.keyword) : (storedParams.keyword || '')))
  const [checkIn, setCheckIn] = useState(() => paramsRef.current.checkIn || storedParams.checkIn || defaultDates.checkIn)
  const [checkOut, setCheckOut] = useState(() => paramsRef.current.checkOut || storedParams.checkOut || defaultDates.checkOut)
  const [minPrice, setMinPrice] = useState(() => paramsRef.current.minPrice || storedParams.minPrice || '')
  const [maxPrice, setMaxPrice] = useState(() => paramsRef.current.maxPrice || storedParams.maxPrice || '')
  const [userLat, setUserLat] = useState(() => paramsRef.current.userLat || storedParams.userLat || '')
  const [userLng, setUserLng] = useState(() => paramsRef.current.userLng || storedParams.userLng || '')
  
  const [priceRange, setPriceRange] = useState([0, 2100])

  useEffect(() => {
    const min = minPrice ? parseInt(minPrice) : 0
    const max = maxPrice ? parseInt(maxPrice) : 2100
    setPriceRange([min, max])
  }, [minPrice, maxPrice])

  // Data State
  const [list, setList] = useState([])
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  
  // Filter State
  const [sort, setSort] = useState('recommend') // recommend, price_asc, price_desc, star
  const [selectedStars, setSelectedStars] = useState(() => {
    if (paramsRef.current.stars) return paramsRef.current.stars.split(',')
    if (Array.isArray(storedParams.selectedStars)) return storedParams.selectedStars
    return []
  })
  const [selectedTags, setSelectedTags] = useState(() => {
    if (paramsRef.current.tags) {
      return safeDecode(paramsRef.current.tags).split(',').filter(Boolean)
    }
    if (Array.isArray(storedParams.selectedTags)) return storedParams.selectedTags
    return []
  })
  const [tagOptions, setTagOptions] = useState([])
  const [calendarVisible, setCalendarVisible] = useState(false)
  const [searchVisible, setSearchVisible] = useState(false)
  const [cityPickerVisible, setCityPickerVisible] = useState(false)
  const [draftCity, setDraftCity] = useState('')
  const [draftKeyword, setDraftKeyword] = useState('')
  
  const dropdownRef = useRef(null)
  const isFirstLoad = useRef(true)
  const loadingRef = useRef(false)
  const pageRef = useRef(page)
  const hasMoreRef = useRef(hasMore)

  const searchParamsRef = useRef({ city, keyword, checkIn, checkOut, minPrice, maxPrice, sort, selectedStars, selectedTags, userLat, userLng })

  useEffect(() => {
    searchParamsRef.current = { city, keyword, checkIn, checkOut, minPrice, maxPrice, sort, selectedStars, selectedTags, userLat, userLng }
  }, [city, keyword, checkIn, checkOut, minPrice, maxPrice, sort, selectedStars, selectedTags, userLat, userLng])

  useEffect(() => {
    hasMoreRef.current = hasMore
  }, [hasMore])

  useEffect(() => {
    pageRef.current = page
  }, [page])

  useEffect(() => {
    Taro.setStorageSync(SEARCH_STORAGE_KEY, {
      city,
      keyword,
      checkIn,
      checkOut,
      minPrice,
      maxPrice,
      sort,
      selectedStars,
      selectedTags,
      userLat,
      userLng
    })
  }, [city, keyword, checkIn, checkOut, minPrice, maxPrice, sort, selectedStars, selectedTags, userLat, userLng])

  useEffect(() => {
    const fetchTagOptions = async () => {
      try {
        const res = await api.get('/api/presets/facilities')
        if (res && Array.isArray(res.data)) {
          setTagOptions(res.data.slice(0, 12).map((item) => item.name).filter(Boolean))
        }
      } catch (error) {}
    }
    fetchTagOptions()
  }, [])

  // Fetch Data
  async function loadMore() {
    if (loadingRef.current || !hasMoreRef.current) return
    loadingRef.current = true
    setLoadingMore(true)
    try {
      const currentParams = searchParamsRef.current
      const nextPage = pageRef.current
      
      const queryParams = new URLSearchParams()
      if (currentParams.city) queryParams.append('city', currentParams.city)
      if (currentParams.keyword) queryParams.append('keyword', currentParams.keyword)
      if (currentParams.checkIn) queryParams.append('checkIn', currentParams.checkIn)
      if (currentParams.checkOut) queryParams.append('checkOut', currentParams.checkOut)
      if (currentParams.minPrice) queryParams.append('minPrice', currentParams.minPrice)
      if (currentParams.maxPrice) queryParams.append('maxPrice', currentParams.maxPrice)
      if (currentParams.sort) queryParams.append('sort', currentParams.sort)
      if (currentParams.selectedStars.length > 0) queryParams.append('stars', currentParams.selectedStars.join(','))
      if (currentParams.selectedTags.length > 0) queryParams.append('tags', currentParams.selectedTags.join(','))
      if (currentParams.userLat) queryParams.append('userLat', currentParams.userLat)
      if (currentParams.userLng) queryParams.append('userLng', currentParams.userLng)
      
      queryParams.append('page', nextPage)
      queryParams.append('pageSize', 10)

      const res = await api.get(`/api/hotels?${queryParams.toString()}`)
      
      if (res && res.list) {
        setList(prev => nextPage === 1 ? res.list : [...prev, ...res.list])
        const nextHasMore = res.list.length >= 10
        setHasMore(nextHasMore)
        hasMoreRef.current = nextHasMore
        setPage(nextPage + 1)
        pageRef.current = nextPage + 1
      } else {
        setHasMore(false)
        hasMoreRef.current = false
      }
    } catch (e) {
      console.error(e)
      setHasMore(false)
      hasMoreRef.current = false
    } finally {
      loadingRef.current = false
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    setPage(1)
    pageRef.current = 1
    setList([])
    setHasMore(true)
    hasMoreRef.current = true
    loadingRef.current = false
    searchParamsRef.current = { city, keyword, checkIn, checkOut, minPrice, maxPrice, sort, selectedStars, selectedTags, userLat, userLng }
    if (isFirstLoad.current) {
      isFirstLoad.current = false
    }
    loadMore()
  }, [sort, selectedStars, selectedTags, city, keyword, minPrice, maxPrice, checkIn, checkOut])

  const handleSearchClick = () => {
    setDraftCity(city)
    setDraftKeyword(keyword)
    setSearchVisible(true)
  }

  const nights = (() => {
    if (!checkIn || !checkOut) return 1
    const diff = (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
    if (!Number.isFinite(diff) || diff <= 0) return 1
    return Math.round(diff)
  })()

  const handleDateConfirm = (val) => {
    if (val && val[0] && val[1]) {
      setCheckIn(formatDate(val[0]))
      setCheckOut(formatDate(val[1]))
      setCalendarVisible(false)
    }
  }

  const handleSearchApply = () => {
    setCity(draftCity)
    setKeyword(draftKeyword)
    setSearchVisible(false)
    searchParamsRef.current = {
      ...searchParamsRef.current,
      city: draftCity,
      keyword: draftKeyword
    }
  }

  return (
    <View className="list-page">
      <PageTopBar title="酒店列表">
        <View className="list-top-extra">
          <View className="list-search-card">
            <View className="list-search-row" onClick={handleSearchClick}>
              <SearchOutline className="search-icon" />
              <Text className="search-text">
                {city || '城市'} · {keyword || '搜索酒店'}
              </Text>
              <Text className="search-action">修改条件</Text>
            </View>
            <View className="list-date-row" onClick={() => setCalendarVisible(true)}>
              <View className="list-date-item">
                <Text className="list-date-label">入住</Text>
                <Text className="list-date-value">{checkIn ? `${checkIn.slice(5).replace('-', '/')} ` : '--/-- '}</Text>
              </View>
              <View className="list-date-nights">{nights}晚</View>
              <View className="list-date-item">
                <Text className="list-date-label">离店</Text>
                <Text className="list-date-value">{checkOut ? `${checkOut.slice(5).replace('-', '/')} ` : '--/-- '}</Text>
              </View>
              <CalendarOutline className="list-date-icon" />
            </View>
          </View>

          <Dropdown ref={dropdownRef} className="filter-dropdown list-filter-dropdown">
            <Dropdown.Item key="sort" title={
              <span className={sort !== 'recommend' ? 'active-filter-label' : ''}>
                {sort === 'recommend' ? '推荐' : '排序'}
              </span>
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
              <span className={(minPrice || maxPrice) ? 'active-filter-label' : ''}>
                价格
              </span>
            }>
              <View className="dropdown-content">
                <View style={{ marginBottom: 32, padding: '0 12px' }}>
                   <View style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, color: '#333', fontSize: 14 }}>
                     <Text>¥{priceRange[0]}</Text>
                     <Text>¥{priceRange[1] === 2100 ? '2100+' : priceRange[1]}</Text>
                   </View>
                   <Slider
                     range
                     min={0}
                     max={2100}
                     step={50}
                     value={priceRange}
                     onChange={val => setPriceRange(val)}
                     style={{ '--fill-color': '#0086F6' }}
                   />
                </View>

                <View style={{ marginBottom: 24 }}>
                   <View style={{ fontSize: 14, color: '#999', marginBottom: 12 }}>价格区间</View>
                   <Space wrap style={{ '--gap': '12px' }}>
                     {[
                       { label: '不限', value: null },
                       { label: '¥150以下', value: '0-150' },
                       { label: '¥150-300', value: '150-300' },
                       { label: '¥300-450', value: '300-450' },
                       { label: '¥450-600', value: '450-600' },
                       { label: '¥600-1000', value: '600-1000' },
                       { label: '¥1000以上', value: '1000+' },
                     ].map(item => {
                       let isActive = false
                       if (item.value === null) isActive = priceRange[0] === 0 && priceRange[1] === 2100
                       else if (item.value.endsWith('+')) isActive = priceRange[0] === parseInt(item.value) && priceRange[1] === 2100
                       else {
                          const [min, max] = item.value.split('-').map(Number)
                          isActive = priceRange[0] === min && priceRange[1] === max
                       }
                       
                       return (
                         <Tag
                           key={item.label}
                           fill={isActive ? 'solid' : 'outline'}
                           color='primary'
                           style={{ 
                             padding: '6px 16px', 
                             borderRadius: 4, 
                             minWidth: 80, 
                             textAlign: 'center',
                             backgroundColor: isActive ? '#0086F6' : '#f5f5f5',
                             color: isActive ? '#fff' : '#333',
                             border: 'none'
                           }}
                           onClick={() => {
                              if (item.value === null) setPriceRange([0, 2100])
                              else if (item.value.endsWith('+')) setPriceRange([parseInt(item.value), 2100])
                              else {
                                const [min, max] = item.value.split('-').map(Number)
                                setPriceRange([min, max])
                              }
                           }}
                         >
                           {item.label}
                         </Tag>
                       )
                     })}
                   </Space>
                </View>

                <View style={{ display: 'flex', gap: 12 }}>
                   <Button block shape='rounded' onClick={() => setPriceRange([0, 2100])} style={{ flex: 1, background: '#f5f5f5', border: 'none', color: '#666' }}>重置</Button>
                   <Button 
                     block 
                     shape='rounded' 
                     color='primary' 
                     onClick={() => {
                        const [min, max] = priceRange
                        if (min === 0 && max === 2100) {
                          setMinPrice('')
                          setMaxPrice('')
                        } else if (max === 2100) {
                          setMinPrice(min.toString())
                          setMaxPrice('')
                        } else {
                          setMinPrice(min.toString())
                          setMaxPrice(max.toString())
                        }
                        dropdownRef.current?.close()
                     }}
                     style={{ flex: 1 }}
                   >
                     确定
                   </Button>
                </View>
              </View>
            </Dropdown.Item>

            <Dropdown.Item key="tags" title={
              <span className={selectedTags.length ? 'active-filter-label' : ''}>
                标签
              </span>
            }>
              <View className="dropdown-content">
                <View className="filter-section-title">常用标签</View>
                <Checkbox.Group value={selectedTags} onChange={(val) => setSelectedTags(val)}>
                  <Space direction='vertical' block>
                    {tagOptions.map((tag) => (
                      <Checkbox 
                        key={tag} 
                        value={tag}
                        style={{ '--icon-size': '18px', '--font-size': '14px' }}
                        className="square-checkbox"
                      >
                        {tag}
                      </Checkbox>
                    ))}
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
            
            <Dropdown.Item key="filter" title={
              <span className={selectedStars.length ? 'active-filter-label' : ''}>
                星级
              </span>
            }>
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
      </PageTopBar>

      {/* List Content */}
      <View className="list-content">
        {createListByType({
          type: 'hotel',
          items: list,
          loading: loadingMore,
          hasMore,
          onLoadMore: loadMore,
          loadTipText: hasMore
            ? (loadingMore ? '正在加载更多酒店...' : '上拉加载更多酒店')
            : (list.length > 0 ? '已全部加载完成' : ''),
          emptyText: '暂无符合条件的酒店',
          onOpen: (hotelId) => Taro.navigateTo({
            url: `/pages/detail/index?id=${hotelId}&checkIn=${checkIn}&checkOut=${checkOut}`
          })
        })}
      </View>

      <CalendarPicker
        selectionMode='range'
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        onConfirm={handleDateConfirm}
        defaultValue={[new Date(checkIn), new Date(checkOut)]}
      />

      <Popup
        visible={searchVisible}
        onMaskClick={() => setSearchVisible(false)}
        bodyStyle={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}
      >
        <View className="list-search-popup">
          <View className="list-search-popup-header">修改查询条件</View>
          <View className="list-search-popup-body">
            <View className="list-search-popup-row" onClick={() => setCityPickerVisible(true)}>
              <Text className="list-search-popup-label">城市</Text>
              <Text className="list-search-popup-value">{draftCity || '请选择城市'}</Text>
            </View>
            <View className="list-search-popup-row">
              <Text className="list-search-popup-label">关键词</Text>
              <SearchBar
                value={draftKeyword}
                placeholder="酒店名/位置/关键词"
                onChange={setDraftKeyword}
                style={{ '--background': '#f5f6fa' }}
              />
            </View>
          </View>
          <View className="list-search-popup-actions">
            <Button onClick={() => setSearchVisible(false)} fill="outline">取消</Button>
            <Button color="primary" onClick={handleSearchApply}>应用</Button>
          </View>
        </View>
      </Popup>

      <Cascader
        options={cityData}
        visible={cityPickerVisible}
        onClose={() => setCityPickerVisible(false)}
        value={[]}
        onConfirm={(v) => {
          if (v && v.length > 0) {
            const selected = v[v.length - 1]
            setDraftCity(selected)
            setDraftKeyword('')
          }
        }}
      />
    </View>
  )
}
