import { useEffect, useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { Button } from 'antd-mobile'
import PageTopBar from '../../components/PageTopBar'
import { cancelOrder, getOrderDetail, useOrder } from '../../services/auth'
import './index.css'

const statusTextMap = {
  pending_payment: '待付款',
  confirmed: '待使用',
  finished: '已完成',
  cancelled: '已取消'
}

const statusClassMap = {
  pending_payment: 'order-detail-status-pending-payment',
  confirmed: 'order-detail-status-pending-use',
  finished: 'order-detail-status-completed',
  cancelled: 'order-detail-status-cancelled'
}

const formatDate = (value) => {
  if (!value) return '--'
  return String(value).slice(0, 10)
}

const formatDateTime = (value) => {
  if (!value) return '--'
  return String(value).replace('T', ' ').slice(0, 16)
}

const getHotelName = (order) => {
  const name = String(order?.hotel?.name || '').trim()
  if (name) return name
  const nameEn = String(order?.hotel?.name_en || '').trim()
  if (nameEn) return nameEn
  const fallback = String(order?.hotel_name || order?.hotelName || '').trim()
  if (fallback) return fallback
  return `酒店 #${order?.hotel_id ?? '--'}`
}

export default function OrderDetail() {
  const router = useRouter()
  const orderId = useMemo(() => Number(router?.params?.id), [router?.params?.id])
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchOrder = async () => {
    if (!orderId) {
      setOrder(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await getOrderDetail(orderId)
      setOrder(data || null)
    } catch (error) {
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrder()
  }, [orderId])

  const handlePay = () => {
    if (!order?.id) return
    Taro.navigateTo({ url: `/pages/order-pay/index?id=${order.id}` })
  }

  const handleCancel = async () => {
    if (!order?.id || actionLoading) return
    setActionLoading(true)
    try {
      const updated = await cancelOrder(order.id)
      setOrder(updated || order)
      Taro.showToast({ title: '订单已取消', icon: 'success' })
      setTimeout(() => {
        Taro.reLaunch({ url: '/pages/orders/index?tab=cancelled' })
      }, 600)
    } catch (error) {
    } finally {
      setActionLoading(false)
    }
  }

  const handleUse = async () => {
    if (!order?.id || actionLoading) return
    setActionLoading(true)
    try {
      const updated = await useOrder(order.id)
      setOrder(updated || order)
      Taro.showToast({ title: '订单已使用', icon: 'success' })
      setTimeout(() => {
        Taro.reLaunch({ url: '/pages/orders/index?tab=finished' })
      }, 600)
    } catch (error) {
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <View className='order-detail-page'>
        <PageTopBar title='订单详情' />
        <View className='order-detail-loading'>
          <Text>正在加载订单...</Text>
        </View>
      </View>
    )
  }

  if (!order) {
    return (
      <View className='order-detail-page'>
        <PageTopBar title='订单详情' />
        <View className='order-detail-loading'>
          <Text>订单不存在或已失效</Text>
        </View>
      </View>
    )
  }

  const hotelName = getHotelName(order)
  const statusText = statusTextMap[order?.status] || order?.status || '未知'
  const statusClass = statusClassMap[order?.status] || 'order-detail-status-default'
  const totalPrice = Number(order?.total_price) || 0
  const nights = Math.max(Number(order?.nights) || 1, 1)
  const quantity = Math.max(Number(order?.quantity) || 1, 1)
  const canPay = order?.status === 'pending_payment'
  const canOperate = order?.status === 'confirmed'

  return (
    <View className='order-detail-page'>
      <PageTopBar title='订单详情' />

      <View className='order-detail-content'>
        <View className='order-detail-card'>
          <View className='order-detail-title-row'>
            <Text className='order-detail-title'>{hotelName}</Text>
            <Text className={`order-detail-status ${statusClass}`}>{statusText}</Text>
          </View>

          <View className='order-detail-row'>
            <Text className='order-detail-label'>订单号</Text>
            <Text className='order-detail-value'>{order?.order_no || `#${order?.id}`}</Text>
          </View>
          <View className='order-detail-row'>
            <Text className='order-detail-label'>入住日期</Text>
            <Text className='order-detail-value'>{formatDate(order?.check_in)} - {formatDate(order?.check_out)}</Text>
          </View>
          <View className='order-detail-row'>
            <Text className='order-detail-label'>房型</Text>
            <Text className='order-detail-value'>{order?.room_type_name || '--'}</Text>
          </View>
          <View className='order-detail-row'>
            <Text className='order-detail-label'>间夜数</Text>
            <Text className='order-detail-value'>{nights * quantity} 间夜</Text>
          </View>
          <View className='order-detail-row'>
            <Text className='order-detail-label'>下单时间</Text>
            <Text className='order-detail-value'>{formatDateTime(order?.created_at)}</Text>
          </View>
          <View className='order-detail-divider' />
          <View className='order-detail-amount'>
            <Text className='order-detail-amount-label'>订单金额</Text>
            <Text className='order-detail-amount-value'>¥{totalPrice}</Text>
          </View>
        </View>

        <View className='order-detail-actions'>
          {canPay ? (
            <Button color='primary' onClick={handlePay}>
              去支付
            </Button>
          ) : null}
          {canOperate ? (
            <>
              <Button fill='outline' color='danger' loading={actionLoading} onClick={handleCancel}>
                取消订单
              </Button>
              <Button color='primary' loading={actionLoading} onClick={handleUse}>
                确认使用
              </Button>
            </>
          ) : null}
        </View>
      </View>
    </View>
  )
}
