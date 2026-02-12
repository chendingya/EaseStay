import { memo } from 'react'
import { View, Text } from '@tarojs/components'
import './index.css'

const statusTextMap = {
  pending_payment: '待付款',
  confirmed: '待使用',
  finished: '已完成',
  cancelled: '已取消'
}

const statusClassMap = {
  pending_payment: 'hotel-order-status-pending-payment',
  confirmed: 'hotel-order-status-pending-use',
  finished: 'hotel-order-status-completed',
  cancelled: 'hotel-order-status-cancelled'
}

const formatDate = (value) => {
  if (!value) return '--'
  return String(value).slice(0, 10)
}

const formatDateTime = (value) => {
  if (!value) return ''
  return String(value).replace('T', ' ').slice(0, 16)
}

function OrderCard({ order, onPay }) {
  const statusText = statusTextMap[order?.status] || order?.status || '未知'
  const statusClass = statusClassMap[order?.status] || 'hotel-order-status-default'
  const hotelName = order?.hotel?.name || `酒店 #${order?.hotel_id ?? '--'}`
  const hotelNameEn = order?.hotel?.name_en || ''
  const stayNights = Math.max(Number(order?.nights) || 1, 1)
  const rooms = Math.max(Number(order?.quantity) || 1, 1)
  const nights = stayNights * rooms
  const roomType = order?.room_type_name || '标准房型'
  const orderNo = order?.order_no || (order?.id ? `#${order.id}` : '#--')
  const totalPrice = Number(order?.total_price) || 0
  const createdAt = formatDateTime(order?.created_at)
  const canPay = order?.status === 'pending_payment'

  return (
    <View className='hotel-order-card'>
      <View className='hotel-order-top'>
        <View className='hotel-order-name-wrap'>
          <Text className='hotel-order-name'>{hotelName}</Text>
          {hotelNameEn ? (
            <Text className='hotel-order-name-en'>{hotelNameEn}</Text>
          ) : null}
        </View>
        <Text className={`hotel-order-status ${statusClass}`}>{statusText}</Text>
      </View>

      <View className='hotel-order-meta'>
        <View className='hotel-order-meta-row'>
          <Text className='hotel-order-label'>入住日期</Text>
          <Text className='hotel-order-value'>{formatDate(order?.check_in)} - {formatDate(order?.check_out)}</Text>
        </View>
        <View className='hotel-order-meta-row'>
          <Text className='hotel-order-label'>房型</Text>
          <Text className='hotel-order-value'>{roomType}</Text>
        </View>
        <View className='hotel-order-meta-row'>
          <Text className='hotel-order-label'>间夜数</Text>
          <Text className='hotel-order-value'>{nights} 间夜</Text>
        </View>
      </View>

      <View className='hotel-order-divider' />

      <View className='hotel-order-bottom'>
        <View className='hotel-order-bottom-left'>
          <Text className='hotel-order-no'>订单号 {orderNo}</Text>
          {createdAt ? <Text className='hotel-order-created'>{createdAt} 下单</Text> : null}
        </View>
        <View className='hotel-order-bottom-right'>
          <Text className='hotel-order-price'>¥{totalPrice}</Text>
          {canPay ? (
            <View className='hotel-order-pay-btn' onClick={() => onPay && onPay(order)}>
              <Text className='hotel-order-pay-text'>去支付</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  )
}

export default memo(OrderCard)
