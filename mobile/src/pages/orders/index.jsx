import { useEffect, useMemo, useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { CapsuleTabs, InfiniteScroll, Button, Empty } from 'antd-mobile'
import { getMyOrders } from '../../services/auth'
import './index.css'

const statusTabs = [
  { key: '', title: '全部' },
  { key: 'confirmed', title: '已确认' },
  { key: 'completed', title: '已完成' },
  { key: 'cancelled', title: '已取消' }
]

const statusTextMap = {
  confirmed: '已确认',
  completed: '已完成',
  cancelled: '已取消'
}

const statusClassMap = {
  confirmed: 'order-status-confirmed',
  completed: 'order-status-completed',
  cancelled: 'order-status-cancelled'
}

const formatDate = (value) => {
  if (!value) return '--'
  return String(value).slice(0, 10)
}

export default function Orders() {
  const [status, setStatus] = useState('')
  const [list, setList] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [isLogin, setIsLogin] = useState(false)

  const pageSize = 10

  const statusLabel = useMemo(() => {
    return statusTabs.reduce((acc, item) => {
      acc[item.key] = item.title
      return acc
    }, {})
  }, [])

  const refresh = () => {
    setList([])
    setTotal(0)
    setPage(1)
    setHasMore(true)
  }

  const loadMore = async () => {
    if (loading || !hasMore || !isLogin) return
    setLoading(true)
    try {
      const res = await getMyOrders({ page, pageSize, status })
      const nextItems = Array.isArray(res?.list) ? res.list : []
      const nextTotal = Number(res?.total) || 0
      setList((prev) => [...prev, ...nextItems])
      setTotal(nextTotal)
      const nextPage = page + 1
      setPage(nextPage)
      setHasMore((page - 1) * pageSize + nextItems.length < nextTotal)
    } catch (error) {
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const token = Taro.getStorageSync('token')
    setIsLogin(!!token)
    refresh()
  }, [status])

  useDidShow(() => {
    const token = Taro.getStorageSync('token')
    const loggedIn = !!token
    setIsLogin(loggedIn)
    refresh()
  })

  useEffect(() => {
    if (isLogin && hasMore) {
      loadMore()
    }
  }, [isLogin, hasMore]) // eslint-disable-line react-hooks/exhaustive-deps

  const gotoLogin = () => {
    Taro.navigateTo({ url: '/pages/login/index' })
  }

  return (
    <View className='orders-page'>
      <View className='orders-filter'>
        <CapsuleTabs activeKey={status} onChange={setStatus}>
          {statusTabs.map((item) => (
            <CapsuleTabs.Tab key={item.key} title={item.title} />
          ))}
        </CapsuleTabs>
      </View>

      {!isLogin ? (
        <View className='orders-login-tip'>
          <Text>登录后可查看{statusLabel[status] || '全部'}订单</Text>
          <View className='orders-login-btn'>
            <Button color='primary' size='small' onClick={gotoLogin}>去登录</Button>
          </View>
        </View>
      ) : (
        <View className='orders-list'>
          {list.map((item) => {
            const statusText = statusTextMap[item.status] || item.status || '未知'
            const statusClass = statusClassMap[item.status] || 'order-status-default'
            return (
              <View key={item.id} className='order-card'>
                <View className='order-header'>
                  <Text className='order-hotel-name'>{item.hotel?.name || '酒店'}</Text>
                  <Text className={`order-status ${statusClass}`}>{statusText}</Text>
                </View>
                <View className='order-row'>
                  <Text className='order-label'>房型</Text>
                  <Text className='order-value'>{item.room_type_name || '--'}</Text>
                </View>
                <View className='order-row'>
                  <Text className='order-label'>入住</Text>
                  <Text className='order-value'>{formatDate(item.check_in)} - {formatDate(item.check_out)}</Text>
                </View>
                <View className='order-row'>
                  <Text className='order-label'>数量</Text>
                  <Text className='order-value'>{item.quantity || 1} 间夜</Text>
                </View>
                <View className='order-row'>
                  <Text className='order-label'>总价</Text>
                  <Text className='order-value order-total'>¥{item.total_price || 0}</Text>
                </View>
              </View>
            )
          })}

          {list.length === 0 && !hasMore && (
            <Empty description='暂无订单' />
          )}
          <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
          {list.length > 0 && (
            <Text className='order-label'>共 {total} 条订单</Text>
          )}
        </View>
      )}
    </View>
  )
}
