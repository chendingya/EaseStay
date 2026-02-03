import { View, Image, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { Swiper, Button, Card, SearchBar, Tag, Space, Toast, Calendar } from 'antd-mobile'
import { SearchOutline, CalendarOutline, EnvironmentOutline } from 'antd-mobile-icons'
import { api } from '../../services/request'
import HotelCard from '../../components/HotelCard'
import './index.css'

// 轮播 Banner 数据
const bannerList = [
  { id: 1, title: '春日出游季', color: '#0086F6' },
  { id: 2, title: '会员专享折扣', color: '#00BFFF' },
  { id: 3, title: '亲子酒店推荐', color: '#FF8C00' },
]

// 快捷标签
const quickTags = ['亲子', '免费停车', '高评分', '近地铁', '含早餐', '海景房']

const formatDate = (date) => {
  if (!date || Number.isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function Index() {
  const [city, setCity] = useState('上海')
  const [keyword, setKeyword] = useState('')
  
  // Initialize with valid dates to prevent flash of empty/NaN content
  const [checkIn, setCheckIn] = useState(() => {
    const d = new Date()
    return formatDate(d)
  })
  const [checkOut, setCheckOut] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return formatDate(d)
  })

  const [calendarVisible, setCalendarVisible] = useState(false)
  const [hotHotels, setHotHotels] = useState([])

  useEffect(() => {
    fetchHotHotels()
  }, [])

  const addDays = (dateStr, days) => {
    const base = new Date(dateStr)
    if (Number.isNaN(base.getTime())) return dateStr
    base.setDate(base.getDate() + days)
    return formatDate(base)
  }

  // 日期选择逻辑待接入 antd-mobile Calendar 组件
  // 目前先保留点击交互，后续集成

  const fetchHotHotels = async () => {
    try {
      const data = await api.get('/api/hotels?pageSize=4')
      if (data && data.list) {
        setHotHotels(data.list)
      }
    } catch (err) {}
  }

  const handleSearch = () => {
    Taro.navigateTo({
      url: `/pages/list/index?city=${city}&keyword=${keyword}&checkIn=${checkIn}&checkOut=${checkOut}`
    })
  }

  const handleTagClick = (tag) => {
    Taro.navigateTo({
      url: `/pages/list/index?city=${city}&keyword=${tag}&checkIn=${checkIn}&checkOut=${checkOut}`
    })
  }

  const handleHotelClick = (id) => {
    Taro.navigateTo({
      url: `/pages/detail/index?id=${id}&checkIn=${checkIn}&checkOut=${checkOut}`
    })
  }

  const handleBannerClick = (index) => {
    // 简单的跳转逻辑示例
    if (hotHotels.length > 0) {
       handleHotelClick(hotHotels[0].id)
    } else {
       handleSearch()
    }
  }

  const handleDateConfirm = (val) => {
    if (val && val[0] && val[1]) {
      setCheckIn(formatDate(val[0]))
      setCheckOut(formatDate(val[1]))
      setCalendarVisible(false)
    }
  }

  const nights = () => {
    if (!checkIn || !checkOut) return 1
    const d1 = new Date(checkIn)
    const d2 = new Date(checkOut)
    if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return 1
    const diff = (d2 - d1) / (1000 * 60 * 60 * 24)
    return Math.max(1, Math.round(diff))
  }

  return (
    <View className="index-page">
      {/* 沉浸式 Banner */}
      <View className="banner-container">
        <Swiper autoplay loop className="banner-swiper">
          {bannerList.map(item => (
            <Swiper.Item key={item.id}>
              <View 
                className="banner-item"
                onClick={() => handleBannerClick()}
                style={{ 
                  background: `linear-gradient(135deg, ${item.color} 0%, ${item.color}cc 100%)`
                }}
              >
                {item.title}
              </View>
            </Swiper.Item>
          ))}
        </Swiper>
      </View>

      {/* 携程风搜索卡片 */}
      <Card className="search-card">
        {/* 城市选择 */}
        <View className="search-row">
           <View style={{ display: 'flex', alignItems: 'center', fontSize: 18, fontWeight: 'bold' }}>
             <EnvironmentOutline style={{ marginRight: 4, color: '#0086F6' }} />
             {city}
             <Tag color="primary" fill="outline" style={{ marginLeft: 8, fontSize: 10 }}>当前位置</Tag>
           </View>
        </View>

        {/* 日期选择 */}
        <View className="date-row" onClick={() => setCalendarVisible(true)}>
          <View>
             <View style={{ color: '#999', fontSize: 12 }}>入住</View>
             <View style={{ fontSize: 16, fontWeight: 'bold', marginTop: 4 }}>
                {checkIn.split('-')[1]}月{checkIn.split('-')[2]}日
             </View>
          </View>
          <View style={{ 
             background: '#f0f2f5', 
             padding: '2px 8px', 
             borderRadius: 10, 
             fontSize: 12, 
             color: '#333' 
          }}>
             {nights()}晚
          </View>
          <View style={{ textAlign: 'right' }}>
             <View style={{ color: '#999', fontSize: 12 }}>离店</View>
             <View style={{ fontSize: 16, fontWeight: 'bold', marginTop: 4 }}>
                {checkOut.split('-')[1]}月{checkOut.split('-')[2]}日
             </View>
          </View>
        </View>

        {/* 关键字搜索 */}
        <View style={{ marginBottom: 20 }}>
          <SearchBar 
            placeholder="关键字/位置/品牌/酒店名" 
            value={keyword}
            onChange={val => setKeyword(val)}
            style={{ '--background': '#f5f5f5', borderRadius: 4 }}
          />
        </View>

        {/* 搜索按钮 */}
        <Button 
          block 
          color="primary" 
          size="large" 
          onClick={handleSearch}
          className="search-btn"
        >
          查询
        </Button>
      </Card>

      {/* 快捷标签 */}
      <View style={{ padding: '20px 16px 0' }}>
        <View style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>快捷筛选</View>
        <Space wrap>
          {quickTags.map((tag, idx) => (
            <Tag 
              key={idx} 
              fill="outline" 
              color="primary"
              onClick={() => handleTagClick(tag)}
              style={{ padding: '6px 12px', borderRadius: 4, background: '#e6f7ff', border: 'none', color: '#0086F6' }}
            >
              {tag}
            </Tag>
          ))}
        </Space>
      </View>

      {/* 热门酒店 */}
      {hotHotels.length > 0 && (
        <View style={{ padding: '20px 16px' }}>
          <View style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>热门推荐</View>
          <Space direction="vertical" block>
            {hotHotels.map(hotel => (
              <HotelCard 
                key={hotel.id} 
                hotel={hotel} 
                onClick={() => handleHotelClick(hotel.id)} 
              />
            ))}
          </Space>
        </View>
      )}

      {/* 日期选择弹窗 */}
      <Calendar
        selectionMode='range'
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        onConfirm={handleDateConfirm}
        defaultValue={[new Date(checkIn), new Date(checkOut)]}
      />
    </View>
  )
}
