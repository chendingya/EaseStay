import { useEffect, useMemo, useRef, useState } from 'react'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { Button, Popup, Selector, Input } from 'antd-mobile'
import { FilterOutline } from 'antd-mobile-icons'
import { getMyOrders } from '../../services/auth'
import OrderList from '../../components/OrderList'
import PageTopBar from '../../components/PageTopBar'
import './index.css'

const statusTabs = [
  { key: 'all', title: '全部' },
  { key: 'pending_payment', title: '待付款' },
  { key: 'confirmed', title: '待使用' },
  { key: 'finished', title: '已完成' },
  { key: 'cancelled', title: '已取消' }
]

const defaultFilters = {
  keyword: '',
  priceSort: 'default',
  dateSort: 'latest'
}

const priceSortOptions = [
  { label: '默认', value: 'default' },
  { label: '金额从低到高', value: 'total_price_asc' },
  { label: '金额从高到低', value: 'total_price_desc' }
]

const dateSortOptions = [
  { label: '最近下单', value: 'latest' },
  { label: '最早下单', value: 'earliest' }
]

const pageSize = 10
const pullThreshold = 72

const getOrderTime = (order) => {
  const ts = order?.created_at ? new Date(order.created_at).getTime() : 0
  return Number.isFinite(ts) ? ts : 0
}

const getOrderPrice = (order) => Number(order?.total_price) || 0

const getOrderHotelName = (order) => String(order?.hotel?.name || '').trim()

export default function Orders() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('all')
  const [list, setList] = useState([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isHeaderElevated, setIsHeaderElevated] = useState(false)
  const [isLogin, setIsLogin] = useState(false)
  const [filterVisible, setFilterVisible] = useState(false)
  const [filters, setFilters] = useState(defaultFilters)
  const [draftFilters, setDraftFilters] = useState(defaultFilters)

  const loadingRef = useRef(false)
  const refreshingRef = useRef(false)
  const pageRef = useRef(1)
  const hasMoreRef = useRef(true)
  const activeTabRef = useRef('all')

  const statusLabelMap = useMemo(() => {
    return statusTabs.reduce((acc, item) => {
      acc[item.key] = item.title
      return acc
    }, {})
  }, [])

  const isFilterActive = useMemo(() => {
    return Boolean(
      filters.keyword.trim() ||
      filters.priceSort !== defaultFilters.priceSort ||
      filters.dateSort !== defaultFilters.dateSort
    )
  }, [filters])

  const displayList = useMemo(() => {
    let next = [...list]

    const keyword = filters.keyword.trim().toLowerCase()
    if (keyword) {
      next = next.filter((order) => getOrderHotelName(order).toLowerCase().includes(keyword))
    }

    if (filters.priceSort === 'total_price_asc') {
      next.sort((a, b) => getOrderPrice(a) - getOrderPrice(b) || getOrderTime(b) - getOrderTime(a))
    } else if (filters.priceSort === 'total_price_desc') {
      next.sort((a, b) => getOrderPrice(b) - getOrderPrice(a) || getOrderTime(b) - getOrderTime(a))
    } else if (filters.dateSort === 'earliest') {
      next.sort((a, b) => getOrderTime(a) - getOrderTime(b))
    } else {
      next.sort((a, b) => getOrderTime(b) - getOrderTime(a))
    }

    return next
  }, [list, filters])

  const setHasMoreSafe = (next) => {
    hasMoreRef.current = next
    setHasMore(next)
  }

  const resetPagination = () => {
    pageRef.current = 1
    setList([])
    setTotal(0)
    setHasMoreSafe(true)
  }

  const mergeOrders = (prev, next) => {
    const seen = new Set()
    const merged = []
    ;[...prev, ...next].forEach((item, idx) => {
      const id = item?.id
      const uniqueId = id !== undefined && id !== null
        ? `id:${id}`
        : `fallback:${idx}:${item?.created_at || ''}:${item?.hotel_id || ''}`
      if (seen.has(uniqueId)) return
      seen.add(uniqueId)
      merged.push(item)
    })
    return merged
  }

  const loadOrders = async ({ reset = false } = {}) => {
    if (loadingRef.current || !isLogin) return
    if (!reset && !hasMoreRef.current) return

    loadingRef.current = true
    setLoading(true)

    const requestPage = reset ? 1 : pageRef.current
    const status = activeTabRef.current === 'all' ? '' : activeTabRef.current

    try {
      const res = await getMyOrders({ page: requestPage, pageSize, status })
      const nextItems = Array.isArray(res?.list) ? res.list : []
      const nextTotal = Number(res?.total) || 0

      setList((prev) => (reset ? mergeOrders([], nextItems) : mergeOrders(prev, nextItems)))
      setTotal(nextTotal)
      pageRef.current = requestPage + 1
      setHasMoreSafe(requestPage * pageSize < nextTotal)
    } catch (error) {
      if (reset) {
        setList([])
        setTotal(0)
      }
      setHasMoreSafe(false)
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    if (refreshingRef.current || loadingRef.current || !isLogin) return
    refreshingRef.current = true
    setRefreshing(true)
    setPullDistance(0)
    resetPagination()
    await loadOrders({ reset: true })
    setRefreshing(false)
    refreshingRef.current = false
  }

  useEffect(() => {
    const token = Taro.getStorageSync('token')
    setIsLogin(!!token)
  }, [])

  useEffect(() => {
    const incomingTab = String(router?.params?.tab || '').trim()
    if (incomingTab && statusTabs.some((item) => item.key === incomingTab)) {
      setActiveTab(incomingTab)
    }
  }, [router?.params?.tab])

  useDidShow(() => {
    const token = Taro.getStorageSync('token')
    setIsLogin(!!token)
  })

  useEffect(() => {
    activeTabRef.current = activeTab
    if (!isLogin) {
      resetPagination()
      return
    }
    resetPagination()
    loadOrders({ reset: true })
  }, [activeTab, isLogin]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabChange = (key) => {
    if (key === activeTab) return
    setActiveTab(key)
    setPullDistance(0)
  }

  const handlePulling = (event) => {
    const dy = Number(event?.detail?.dy) || 0
    setPullDistance(dy > 0 ? dy : 0)
  }

  const handlePullEnd = () => {
    if (!refreshing) {
      setPullDistance(0)
    }
  }

  const handleScrollChange = (scrollTop) => {
    setIsHeaderElevated(scrollTop > 8)
  }

  const handleFilterOpen = () => {
    setDraftFilters(filters)
    setFilterVisible(true)
  }

  const handleFilterReset = () => {
    setDraftFilters(defaultFilters)
    setFilters(defaultFilters)
    setFilterVisible(false)
  }

  const handleFilterApply = () => {
    setFilters({
      keyword: draftFilters.keyword.trim(),
      priceSort: draftFilters.priceSort,
      dateSort: draftFilters.dateSort
    })
    setFilterVisible(false)
  }

  const gotoLogin = () => {
    Taro.navigateTo({ url: '/pages/login/index' })
  }

  const handlePayOrder = (order) => {
    if (!order?.id) return
    Taro.navigateTo({ url: `/pages/order-pay/index?id=${order.id}` })
  }

  const pullLabel = refreshing
    ? '正在刷新订单...'
    : (pullDistance >= pullThreshold ? '松手立即刷新' : (pullDistance > 0 ? '下拉刷新订单' : ''))

  const summaryText = isFilterActive ? `筛选后 ${displayList.length} 条` : `共 ${total} 条订单`

  return (
    <View className='orders-page'>
      <PageTopBar
        title='订单'
        elevated={isHeaderElevated}
        rightActions={[
          {
            key: 'filter',
            icon: <FilterOutline className='orders-filter-icon' />,
            onClick: handleFilterOpen,
            active: isFilterActive
          }
        ]}
      >
        <View className='orders-tabs'>
          {statusTabs.map((tab) => (
            <View
              key={tab.key}
              className={`orders-tab-item ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.key)}
            >
              <Text className='orders-tab-text'>{tab.title}</Text>
            </View>
          ))}
        </View>
      </PageTopBar>

      {!isLogin ? (
        <View className='orders-login-tip'>
          <Text className='orders-login-text'>登录后可查看{statusLabelMap[activeTab] || '全部'}订单</Text>
          <View className='orders-login-btn'>
            <Button color='primary' size='small' onClick={gotoLogin}>去登录</Button>
          </View>
        </View>
      ) : (
        <View className='orders-content'>
          <OrderList
            list={displayList}
            total={isFilterActive ? displayList.length : total}
            summaryText={summaryText}
            hasMore={hasMore}
            loading={loading}
            refreshing={refreshing}
            pullLabel={pullLabel}
            onLoadMore={loadOrders}
            onRefresh={handleRefresh}
            onPulling={handlePulling}
            onPullEnd={handlePullEnd}
            onScrollChange={handleScrollChange}
            onPay={handlePayOrder}
          />
        </View>
      )}

      <Popup
        visible={filterVisible}
        onMaskClick={() => setFilterVisible(false)}
        bodyStyle={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}
      >
        <View className='orders-filter-panel'>
          <Text className='orders-filter-title'>筛选条件</Text>

          <View className='orders-filter-section'>
            <Text className='orders-filter-label'>酒店关键词</Text>
            <Input
              value={draftFilters.keyword}
              placeholder='输入酒店名称关键词'
              clearable
              onChange={(value) => setDraftFilters((prev) => ({ ...prev, keyword: value }))}
            />
          </View>

          <View className='orders-filter-section'>
            <Text className='orders-filter-label'>金额排序</Text>
            <Selector
              options={priceSortOptions}
              value={[draftFilters.priceSort]}
              onChange={(value) => {
                setDraftFilters((prev) => ({ ...prev, priceSort: value[0] || 'default' }))
              }}
            />
          </View>

          <View className='orders-filter-section'>
            <Text className='orders-filter-label'>时间排序</Text>
            <Selector
              options={dateSortOptions}
              value={[draftFilters.dateSort]}
              onChange={(value) => {
                setDraftFilters((prev) => ({ ...prev, dateSort: value[0] || 'latest' }))
              }}
            />
          </View>

          <View className='orders-filter-actions'>
            <Button fill='outline' onClick={handleFilterReset}>重置</Button>
            <Button color='primary' onClick={handleFilterApply}>确定</Button>
          </View>
        </View>
      </Popup>
    </View>
  )
}
