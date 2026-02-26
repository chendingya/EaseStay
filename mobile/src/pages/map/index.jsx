import { View, Text } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import { Toast, Dropdown, Radio, Checkbox, Button, Space, Slider, Tag } from 'antd-mobile'
import { LeftOutline, SearchOutline, CloseCircleOutline, EnvironmentOutline } from 'antd-mobile-icons'
import { api, resolveImageUrl } from '../../services/request'
import './index.css'

const AMAP_KEY = 'ddced92dcf9226be15b73e95708224f9'

function formatDist(km) {
  if (km == null) return ''
  if (km < 1) return `${Math.round(km * 1000)}m`
  return `${km.toFixed(1)}km`
}

export default function MapSearch() {
  const router = useRouter()
  const storedParams = Taro.getStorageSync('hotel_search_params') || {}
  const initCity = router.params?.city
    ? decodeURIComponent(router.params.city)
    : storedParams.city || '上海'
  const initCheckIn = router.params?.checkIn || storedParams.checkIn || ''
  const initCheckOut = router.params?.checkOut || storedParams.checkOut || ''

  // ── 搜索状态 ──
  const [searchText, setSearchText] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedPOI, setSelectedPOI] = useState(null) // { name, lng, lat, city }
  const [city, setCity] = useState(initCity)
  const [checkIn] = useState(initCheckIn)
  const [checkOut] = useState(initCheckOut)

  // ── 酒店数据 ──
  const [hotels, setHotels] = useState([])  // [{ id, name, lng, lat, lowestPrice, distanceKm, ... }]
  const [loading, setLoading] = useState(false)
  const [activeId, setActiveId] = useState(null)

  // ── 地图 ──
  const mapRef = useRef(null)           // AMap 实例
  const markersRef = useRef({})         // hotelId → AMap.Marker
  const poiMarkerRef = useRef(null)     // 目标 POI 标记
  const listRef = useRef(null)          // 底部列表 DOM 节点
  const cardRefs = useRef({})           // hotelId → card DOM 节点
  const [mapReady, setMapReady] = useState(false) // AMap 初始化完成标志

  // ── 搜索防抖 ──
  const debounceTimer = useRef(null)

  // ── 筛选 ──
  const [sort, setSort] = useState('recommend')
  const [selectedStars, setSelectedStars] = useState([])
  const [selectedTags, setSelectedTags] = useState([])
  const [priceRange, setPriceRange] = useState([0, 2100])
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [tagOptions, setTagOptions] = useState([])
  const dropdownRef = useRef(null)

  // ───────────────────────────────────────────
  // -1. 地图页隐藏全局导航栏预留的底部 padding
  useEffect(() => {
    const appContent = document.querySelector('.app-content')
    if (appContent) {
      const prev = appContent.style.paddingBottom
      appContent.style.paddingBottom = '0'
      return () => { appContent.style.paddingBottom = prev }
    }
  }, [])

  // 0. 加载标签选项
  // ───────────────────────────────────────────
  useEffect(() => {
    api.get('/api/presets/facilities').then(res => {
      if (res && Array.isArray(res.data)) {
        setTagOptions(res.data.slice(0, 12).map(item => item.name).filter(Boolean))
      }
    }).catch(() => {})
  }, [])

  // ───────────────────────────────────────────
  // 1. 加载 AMap SDK
  // ───────────────────────────────────────────
  useEffect(() => {
    if (process.env.TARO_ENV !== 'h5') return
    if (window.AMap) {
      initMap()
      return
    }
    if (document.querySelector('script[src*="webapi.amap.com/maps"]')) {
      const t = setInterval(() => { if (window.AMap) { clearInterval(t); initMap() } }, 100)
      return () => clearInterval(t)
    }
    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&plugin=AMap.Geocoder,AMap.PlaceSearch`
    script.onload = initMap
    script.onerror = () => Toast.show({ content: '地图加载失败', icon: 'fail' })
    document.body.appendChild(script)
    return () => {}
  }, [])

  // ───────────────────────────────────────────
  // 2. 当城市、POI 或筛选变化时，重新拉取酒店坐标
  // ───────────────────────────────────────────
  useEffect(() => {
    fetchHotelLocations()
  }, [city, selectedPOI, sort, selectedStars, selectedTags, minPrice, maxPrice])

  // ───────────────────────────────────────────
  // 2.5 酒店列表数据更新后，底部卡片列表滚回起点
  // ───────────────────────────────────────────
  useEffect(() => {
    // hotels 变化说明排序/筛选/城市等条件发生了改变，列表应回到起始
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollLeft = 0
      }
    })
  }, [hotels])

  // ───────────────────────────────────────────
  // 3. 当酒店数据准备好且地图已初始化，渲染标记
  // ───────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || hotels.length === 0) return
    renderMarkers()
    // setFitView 自动适配所有已添加的覆盖物，避免手动构造 Bounds 触发的 API 兼容问题
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.setFitView(null, false, [60, 60, 200, 60], 16)
      }
    }, 100)
  }, [hotels, mapReady])

  // ───────────────────────────────────────────
  // 4. activeId 变化时，刷新气泡高亮
  // ───────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || Object.keys(markersRef.current).length === 0) return
    refreshBubbles(activeId)
  }, [activeId, mapReady])
  function initMap() {
    if (mapRef.current) return
    const container = document.getElementById('map-view-container')
    if (!container) return
    const map = new window.AMap.Map('map-view-container', {
      zoom: 13,
      center: [121.4737, 31.2304],
      mapStyle: 'amap://styles/whitesmoke',
    })
    mapRef.current = map
    // 等地图瓦片渲染完成再标记 ready，避免 Pixel(NaN,NaN)
    map.on('complete', () => setMapReady(true))
  }

  async function fetchHotelLocations() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('city', city)
      if (selectedPOI) {
        params.append('targetLng', selectedPOI.lng)
        params.append('targetLat', selectedPOI.lat)
      }
      if (sort) params.append('sort', sort)
      if (selectedStars.length > 0) params.append('stars', selectedStars.join(','))
      if (selectedTags.length > 0) params.append('tags', selectedTags.join(','))
      if (minPrice) params.append('minPrice', minPrice)
      if (maxPrice) params.append('maxPrice', maxPrice)

      const res = await api.get(`/api/map/hotel-locations?${params.toString()}`)
      if (res && res.success && Array.isArray(res.data)) {
        setHotels(res.data)
        // 每次重新拉取都重置激活项（筛选/城市变化后旧 id 可能已不存在）
        setActiveId(res.data.length > 0 ? res.data[0].id : null)
      } else {
        setHotels([])
      }
    } catch (e) {
      console.error('fetchHotelLocations error', e)
      setHotels([])
    } finally {
      setLoading(false)
    }
  }

  function renderMarkers() {
    if (!mapRef.current || !window.AMap) return
    // 清除旧标记
    Object.values(markersRef.current).forEach(m => m?.remove())
    markersRef.current = {}

    hotels.forEach(hotel => {
      if (!hotel.lng || !hotel.lat) return
      const isActive = hotel.id === activeId
      const price = Number.isFinite(Number(hotel.lowestPrice)) ? `￥${hotel.lowestPrice}` : null
      if (!price) return  // 暂无价格的不展示标记
      const el = buildBubbleEl(price, isActive)
      const marker = new window.AMap.Marker({
        position: [hotel.lng, hotel.lat],
        content: el,
        anchor: 'bottom-center',
        zIndex: isActive ? 300 : 200,
      })
      marker.on('click', () => selectHotel(hotel.id))
      mapRef.current.add(marker)
      markersRef.current[hotel.id] = marker
    })

    // 目标 POI 标记
    if (poiMarkerRef.current) {
      poiMarkerRef.current.remove()
      poiMarkerRef.current = null
    }
    if (selectedPOI) {
      const poiEl = document.createElement('div')
      poiEl.className = 'map-poi-marker'
      poiEl.innerHTML = `
        <div class="map-poi-marker-pin">📍</div>
        <div class="map-poi-marker-label">${selectedPOI.name}</div>
      `
      const poiMarker = new window.AMap.Marker({
        position: [selectedPOI.lng, selectedPOI.lat],
        content: poiEl,
        anchor: 'bottom-center',
        zIndex: 500,
      })
      mapRef.current.add(poiMarker)
      poiMarkerRef.current = poiMarker
    }
  }

  function buildBubbleEl(text, isActive) {
    const outer = document.createElement('div')
    outer.style.cssText = 'position:relative;display:inline-block;cursor:pointer;'

    const bubble = document.createElement('div')
    bubble.setAttribute('data-role', 'price-bubble')
    applyBubbleStyle(bubble, isActive)
    bubble.textContent = text

    const arrow = document.createElement('div')
    arrow.setAttribute('data-role', 'price-arrow')
    applyArrowStyle(arrow, isActive)

    outer.appendChild(bubble)
    outer.appendChild(arrow)
    return outer
  }

  function applyBubbleStyle(el, isActive) {
    el.style.cssText = [
      'display:inline-flex',
      'align-items:center',
      'justify-content:center',
      'padding:4px 10px',
      'border-radius:20px',
      `background:${isActive ? '#0052cc' : '#1677ff'}`,
      'color:#fff',
      `font-size:${isActive ? '14px' : '12px'}`,
      `font-weight:${isActive ? '700' : '500'}`,
      'white-space:nowrap',
      'box-shadow:0 2px 8px rgba(0,0,0,0.3)',
      `border:2px solid ${isActive ? '#003d99' : 'transparent'}`,
      'line-height:1.4',
    ].join(';')
  }

  function applyArrowStyle(el, isActive) {
    el.style.cssText = [
      'position:absolute',
      'bottom:-6px',
      'left:50%',
      'transform:translateX(-50%)',
      'width:0',
      'height:0',
      'border-left:5px solid transparent',
      'border-right:5px solid transparent',
      `border-top:6px solid ${isActive ? '#0052cc' : '#1677ff'}`,
    ].join(';')
  }

  // 应用筛选确认（价格）
  function applyPriceFilter() {
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
  }

  function selectHotel(id) {
    setActiveId(id)
    // 地图移至该酒店
    const hotel = hotels.find(h => h.id === id)
    if (hotel && hotel.lng && mapRef.current) {
      mapRef.current.setCenter([hotel.lng, hotel.lat])
    }
    // 底部列表横滑到该卡片
    const cardEl = cardRefs.current[id]
    if (cardEl && listRef.current) {
      cardEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
    // 刷新气泡样式
    refreshBubbles(id)
  }

  function refreshBubbles(activeHotelId) {
    hotels.forEach(hotel => {
      const marker = markersRef.current[hotel.id]
      if (!marker) return
      const isActive = hotel.id === activeHotelId
      try {
        // 尝试多种方式拿到 content 容器 DOM
        let outer = null
        const content = marker.getContent?.()
        if (content instanceof Element) {
          outer = content
        } else {
          outer = marker.dom || marker.getElement?.()
        }
        if (!outer) return
        const bubble = outer.querySelector('[data-role="price-bubble"]')
        const arrow = outer.querySelector('[data-role="price-arrow"]')
        if (bubble) applyBubbleStyle(bubble, isActive)
        if (arrow) applyArrowStyle(arrow, isActive)
        if (marker.setZIndex) marker.setZIndex(isActive ? 300 : 200)
      } catch (_) {}
    })
  }

  // ───────────────────────────────────────────
  // POI 搜索
  // ───────────────────────────────────────────
  function onSearchInput(text) {
    setSearchText(text)
    if (!text.trim()) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await api.get(`/api/map/search?keywords=${encodeURIComponent(text)}`)
        if (res && res.success && Array.isArray(res.data)) {
          setSuggestions(res.data.slice(0, 8))
          setShowSuggestions(true)
          dropdownRef.current?.close()
        }
      } catch (e) {
        setSuggestions([])
      }
    }, 400)
  }

  function onSelectSuggestion(poi) {
    // poi: { name, address, location, cityname }
    setShowSuggestions(false)
    if (!poi.location) return

    const [lngStr, latStr] = poi.location.split(',')
    const lng = parseFloat(lngStr)
    const lat = parseFloat(latStr)
    // 提取城市名（去掉"市"以外的字符）
    const poiCity = poi.cityname || poi.pname || ''
    const newCity = poiCity || city

    setSearchText(poi.name)
    setSelectedPOI({ name: poi.name, lng, lat, city: newCity })
    setCity(newCity)
  }

  function clearSearch() {
    setSearchText('')
    setSuggestions([])
    setShowSuggestions(false)
    setSelectedPOI(null)
    // 清除 POI 后，如果当前是距离排序则回退到推荐
    if (sort === 'distance') setSort('recommend')
  }

  function goBack() {
    Taro.navigateBack()
  }

  function goToDetail(hotel) {
    if (!hotel) return
    Taro.navigateTo({
      url: `/pages/detail/index?id=${hotel.id}${checkIn ? `&checkIn=${checkIn}` : ''}${checkOut ? `&checkOut=${checkOut}` : ''}`
    })
  }

  return (
    <View className="map-search-page">
      {/* ── 顶部搜索栏 ── */}
      <View className="map-top-bar">
        <View className="map-back-btn" onClick={goBack}>
          <LeftOutline />
        </View>
        <View className="map-search-input-wrap">
          <SearchOutline className="map-search-icon" />
          <input
            className="map-search-input"
            type="text"
            value={searchText}
            placeholder="搜索景点、车站、商圈…"
            onChange={e => onSearchInput(e.target.value)}
            onFocus={() => { if (searchText) { setShowSuggestions(true); dropdownRef.current?.close() } }}
          />
          {searchText ? (
            <View className="map-search-clear" onClick={clearSearch}>
              <CloseCircleOutline />
            </View>
          ) : null}
        </View>
        <View className="map-city-tag">
          <EnvironmentOutline style={{ marginRight: 2 }} />
          <Text>{city}</Text>
        </View>
      </View>

      {/* ── 筛选条（替代标题栏）── */}
      <Dropdown ref={dropdownRef} className="map-filter-dropdown" onClick={() => setShowSuggestions(false)}>
        <Dropdown.Item key="sort" title={
          <span className={sort !== 'recommend' ? 'active-filter-label' : ''}>
            {sort === 'distance' ? '距离' : sort === 'price_asc' ? '价格↑' : sort === 'price_desc' ? '价格↓' : sort === 'star' ? '星级' : '推荐'}
          </span>
        }>
          <View className="map-dropdown-content">
            <Radio.Group value={sort} onChange={val => { setSort(val); dropdownRef.current?.close() }}>
              <Space direction="vertical" block>
                <Radio value="recommend">推荐排序</Radio>
                <Radio value="distance" disabled={!selectedPOI}>
                  距离从近到远{!selectedPOI ? <Text style={{ color: '#999', fontSize: 12, marginLeft: 6 }}>需先搜索目的地</Text> : null}
                </Radio>
                <Radio value="price_asc">价格低到高</Radio>
                <Radio value="price_desc">价格高到低</Radio>
                <Radio value="star">星级高到低</Radio>
              </Space>
            </Radio.Group>
          </View>
        </Dropdown.Item>

        <Dropdown.Item key="price" title={
          <span className={(minPrice || maxPrice) ? 'active-filter-label' : ''}>价格</span>
        }>
          <View className="map-dropdown-content">
            <View style={{ marginBottom: 28, padding: '0 12px' }}>
              <View style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, color: '#333', fontSize: 14 }}>
                <Text>￥{priceRange[0]}</Text>
                <Text>￥{priceRange[1] === 2100 ? '2100+' : priceRange[1]}</Text>
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
            <View style={{ marginBottom: 20 }}>
              <Space wrap style={{ '--gap': '10px' }}>
                {[
                  { label: '不限', value: null },
                  { label: '￥150以下', value: '0-150' },
                  { label: '￥150-300', value: '150-300' },
                  { label: '￥300-600', value: '300-600' },
                  { label: '￥600-1000', value: '600-1000' },
                  { label: '￥1000以上', value: '1000+' },
                ].map(item => {
                  let isActive = false
                  if (item.value === null) isActive = priceRange[0] === 0 && priceRange[1] === 2100
                  else if (item.value.endsWith('+')) isActive = priceRange[0] === parseInt(item.value) && priceRange[1] === 2100
                  else { const [mn, mx] = item.value.split('-').map(Number); isActive = priceRange[0] === mn && priceRange[1] === mx }
                  return (
                    <Tag
                      key={item.label}
                      fill={isActive ? 'solid' : 'outline'}
                      color="primary"
                      style={{ padding: '5px 14px', borderRadius: 4, backgroundColor: isActive ? '#0086F6' : '#f5f5f5', color: isActive ? '#fff' : '#333', border: 'none' }}
                      onClick={() => {
                        if (item.value === null) setPriceRange([0, 2100])
                        else if (item.value.endsWith('+')) setPriceRange([parseInt(item.value), 2100])
                        else { const [mn, mx] = item.value.split('-').map(Number); setPriceRange([mn, mx]) }
                      }}
                    >{item.label}</Tag>
                  )
                })}
              </Space>
            </View>
            <View style={{ display: 'flex', gap: 12 }}>
              <Button block shape="rounded" onClick={() => setPriceRange([0, 2100])} style={{ flex: 1, background: '#f5f5f5', border: 'none', color: '#666' }}>重置</Button>
              <Button block shape="rounded" color="primary" onClick={applyPriceFilter} style={{ flex: 1 }}>确定</Button>
            </View>
          </View>
        </Dropdown.Item>

        <Dropdown.Item key="tags" title={
          <span className={selectedTags.length ? 'active-filter-label' : ''}>标签</span>
        }>
          <View className="map-dropdown-content">
            <Checkbox.Group value={selectedTags} onChange={val => setSelectedTags(val)}>
              <Space direction="vertical" block>
                {tagOptions.map(tag => (
                  <Checkbox key={tag} value={tag} style={{ '--icon-size': '18px', '--font-size': '14px' }} className="square-checkbox">{tag}</Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
            <Button block color="primary" style={{ marginTop: 16 }} onClick={() => dropdownRef.current?.close()}>确定</Button>
          </View>
        </Dropdown.Item>

        <Dropdown.Item key="stars" title={
          <span className={selectedStars.length ? 'active-filter-label' : ''}>星级</span>
        }>
          <View className="map-dropdown-content">
            <Checkbox.Group value={selectedStars} onChange={val => setSelectedStars(val)}>
              <Space direction="vertical" block>
                <Checkbox value="0" className="square-checkbox">未评级</Checkbox>
                <Checkbox value="1" className="square-checkbox">一星级</Checkbox>
                <Checkbox value="2" className="square-checkbox">二星级</Checkbox>
                <Checkbox value="3" className="square-checkbox">三星级</Checkbox>
                <Checkbox value="4" className="square-checkbox">四星级</Checkbox>
                <Checkbox value="5" className="square-checkbox">五星级</Checkbox>
              </Space>
            </Checkbox.Group>
            <Button block color="primary" style={{ marginTop: 16 }} onClick={() => dropdownRef.current?.close()}>确定</Button>
          </View>
        </Dropdown.Item>
      </Dropdown>

      {/* ── 状态提示条 ── */}
      {selectedPOI ? (
        <View className="map-poi-tip">
          <EnvironmentOutline style={{ color: '#0086F6', marginRight: 4 }} />
          <Text className="map-poi-tip-text">
            已定位到「{selectedPOI.name}」，展示周边 {hotels.length} 家酒店
          </Text>
        </View>
      ) : (
        <View className="map-city-tip">
          <Text className="map-city-tip-text">
            {loading ? '加载中…' : `${city} · 共 ${hotels.length} 家酒店`}
          </Text>
          <Text className="map-city-tip-hint">搜索目的地可查看步行距离</Text>
        </View>
      )}

      {/* ── POI 搜索建议下拉 ── */}
      {showSuggestions && suggestions.length > 0 && (
        <>
          <View className="map-suggestions-backdrop" onClick={() => setShowSuggestions(false)} />
          <View className="map-suggestions">
            {suggestions.map((poi, idx) => (
              <View
                key={idx}
                className="map-suggestion-item"
                onClick={() => onSelectSuggestion(poi)}
              >
                <EnvironmentOutline className="map-sug-icon" />
                <View className="map-sug-info">
                  <Text className="map-sug-name">{poi.name}</Text>
                  <Text className="map-sug-addr">
                    {[poi.cityname, poi.adname, poi.address].filter(Boolean).join(' ')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* ── 地图主体 ── */}
      <View className="map-view-area">
        {process.env.TARO_ENV === 'h5' ? (
          <div id="map-view-container" style={{ width: '100%', height: '100%' }} />
        ) : (
          <View className="map-native-fallback">
            <Text>地图仅支持 H5 预览</Text>
          </View>
        )}

        {/* 回到目的地按钮 */}
        {selectedPOI && (
          <View
            className="map-recenter-btn"
            onClick={() => {
              if (mapRef.current && selectedPOI) {
                mapRef.current.setCenter([selectedPOI.lng, selectedPOI.lat])
                mapRef.current.setZoom(14)
              }
            }}
          >
            <EnvironmentOutline />
            <Text style={{ fontSize: 11 }}>目的地</Text>
          </View>
        )}

        {/* 加载遮罩 */}
        {loading && (
          <View className="map-loading-mask">
            <Text className="map-loading-text">加载酒店中…</Text>
          </View>
        )}
      </View>

      {/* ── 底部横向酒店卡片列表 ── */}
      <View className="map-hotel-list-wrap">
        <View className="map-hotel-list-header">
          <Text className="map-hotel-list-count">
            {selectedPOI ? `距「${selectedPOI.name}」最近` : `${city} 全部酒店`}
          </Text>
          <Text className="map-hotel-list-count-num">{hotels.length} 家</Text>
        </View>
        <div
          className="map-hotel-list"
          ref={listRef}
        >
          {hotels.length === 0 && !loading ? (
            <View className="map-hotel-empty">
              <Text>暂无酒店数据</Text>
            </View>
          ) : (
            hotels.map(hotel => (
              <div
                key={hotel.id}
                ref={el => { cardRefs.current[hotel.id] = el }}
                className={`map-hotel-card${hotel.id === activeId ? ' map-hotel-card-active' : ''}`}
                onClick={() => selectHotel(hotel.id)}
              >
                {/* 图片 */}
                <HotelCardImage hotel={hotel} />
                {/* 信息 */}
                <View className="map-card-body">
                  {/* 文字信息区：flex:1 overflow:hidden，超出就裁，不影响 footer */}
                  <View className="map-card-info">
                    <Text className="map-card-name" numberOfLines={1}>
                      {hotel.name || hotel.name_en}
                    </Text>
                    {hotel.name_en ? (
                      <Text className="map-card-name-en" numberOfLines={1}>{hotel.name_en}</Text>
                    ) : null}
                    <View className="map-card-meta-row">
                      {hotel.star_rating > 0 ? (
                        <Text className="map-card-star">{'★'.repeat(Math.min(hotel.star_rating, 5))}</Text>
                      ) : null}
                      {hotel.distanceKm != null ? (
                        <Text className="map-card-dist">{formatDist(hotel.distanceKm)}</Text>
                      ) : null}
                    </View>
                    <Text className="map-card-addr" numberOfLines={1}>
                      {hotel.address}
                    </Text>
                  </View>
                  {/* footer 始终固定在底部，flex-shrink:0 */}
                  <View className="map-card-footer">
                    {Number.isFinite(Number(hotel.lowestPrice)) ? (
                      <View className="map-card-price-wrap">
                        <Text className="map-card-price-sym">¥</Text>
                        <Text className="map-card-price-val">{hotel.lowestPrice}</Text>
                        <Text className="map-card-price-sfx"> 起</Text>
                      </View>
                    ) : (
                      <Text className="map-card-price-empty">暂无房型</Text>
                    )}
                    <View
                      className="map-card-book-btn"
                      onClick={e => { e.stopPropagation(); goToDetail(hotel) }}
                    >
                      <Text className="map-card-book-text">查看</Text>
                    </View>
                  </View>
                </View>
              </div>
            ))
          )}
        </div>
      </View>
    </View>
  )
}

// 小组件：懒加载酒店封面图
function HotelCardImage({ hotel }) {
  const [failed, setFailed] = useState(false)
  const src = Array.isArray(hotel.images) && hotel.images[0] ? hotel.images[0] : hotel.cover_image || ''
  const optimized = resolveImageUrl(src, { width: 200, height: 120, quality: 70 })
  if (!src || failed) {
    return <View className="map-card-img map-card-img-placeholder" />
  }
  return (
    <img
      className="map-card-img"
      src={optimized}
      alt={hotel.name}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
