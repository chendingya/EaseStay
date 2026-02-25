import { useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { Button, Selector } from 'antd-mobile'
import PageTopBar from '../../components/PageTopBar'
import { getOrderDetail, payOrder } from '../../services/auth'
import { glassToast } from '../../services/glassToast'
import './index.css'

const payChannelOptions = [
  { label: '微信支付', value: 'wechat' },
  { label: '支付宝', value: 'alipay' },
  { label: '银行卡', value: 'bank' }
]

const getHotelName = (order) => {
  const name = String(order?.hotel?.name || '').trim()
  if (name) return name
  const nameEn = String(order?.hotel?.name_en || '').trim()
  if (nameEn) return nameEn
  const fallback = String(order?.hotel_name || order?.hotelName || '').trim()
  if (fallback) return fallback
  return `酒店 #${order?.hotel_id ?? '--'}`
}

const formatDate = (value) => {
  if (!value) return '--'
  return String(value).slice(0, 10)
}

export default function OrderPay() {
  const router = useRouter()
  const orderId = router?.params?.id
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [payChannel, setPayChannel] = useState('wechat')

  const fetchOrder = async () => {
    if (!orderId) return
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

  const handlePay = async () => {
    if (!orderId || paying) return
    setPaying(true)
    try {
      await payOrder(orderId, { channel: payChannel })
      glassToast.success('支付成功')
      Taro.reLaunch({ url: '/pages/orders/index?tab=confirmed' })
    } catch (error) {
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <View className='order-pay-page'>
        <PageTopBar title='订单支付' />
        <View className='order-pay-loading'>
          <Text>正在加载订单...</Text>
        </View>
      </View>
    )
  }

  if (!order) {
    return (
      <View className='order-pay-page'>
        <PageTopBar title='订单支付' />
        <View className='order-pay-loading'>
          <Text>订单不存在或已失效</Text>
        </View>
      </View>
    )
  }

  const hotelName = getHotelName(order)
  const totalPrice = Number(order?.total_price) || 0
  const canPay = order?.status === 'pending_payment'

  return (
    <View className='order-pay-page'>
      <PageTopBar title='订单支付' />

      <View className='order-pay-content'>
        <View className='order-pay-card'>
          <Text className='order-pay-title'>{hotelName}</Text>
          <View className='order-pay-row'>
            <Text className='order-pay-label'>订单号</Text>
            <Text className='order-pay-value'>{order?.order_no || `#${order?.id}`}</Text>
          </View>
          <View className='order-pay-row'>
            <Text className='order-pay-label'>入住日期</Text>
            <Text className='order-pay-value'>{formatDate(order?.check_in)} - {formatDate(order?.check_out)}</Text>
          </View>
          <View className='order-pay-row'>
            <Text className='order-pay-label'>房型</Text>
            <Text className='order-pay-value'>{order?.room_type_name || '--'}</Text>
          </View>
          <View className='order-pay-row'>
            <Text className='order-pay-label'>支付状态</Text>
            <Text className='order-pay-value'>{canPay ? '待支付' : '已支付'}</Text>
          </View>
          <View className='order-pay-divider' />
          <View className='order-pay-amount'>
            <Text className='order-pay-amount-label'>应付金额</Text>
            <Text className='order-pay-amount-value'>¥{totalPrice}</Text>
          </View>
        </View>

        <View className='order-pay-card'>
          <Text className='order-pay-title'>支付方式</Text>
          <Selector
            options={payChannelOptions}
            value={[payChannel]}
            onChange={(value) => setPayChannel(value[0] || 'wechat')}
          />
        </View>

        <View className='order-pay-actions'>
          <Button
            block
            color='primary'
            disabled={!canPay || paying}
            loading={paying}
            onClick={handlePay}
          >
            {canPay ? '确认支付' : '订单已支付'}
          </Button>
        </View>
      </View>
    </View>
  )
}
