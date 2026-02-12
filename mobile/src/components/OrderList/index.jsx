import { memo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import { Empty } from 'antd-mobile'
import OrderCard from '../OrderCard'
import './index.css'

const getOrderKey = (order, index) => {
  if (order?.id !== undefined && order?.id !== null) {
    return `order-${order.id}`
  }
  return `order-fallback-${order?.created_at || ''}-${order?.hotel_id || ''}-${index}`
}

const renderSkeletonCards = (count, prefix) => {
  return Array.from({ length: count }).map((_, idx) => (
    <View key={`${prefix}-${idx}`} className='hotel-order-skeleton-card'>
      <View className='hotel-order-skeleton-line title' />
      <View className='hotel-order-skeleton-line short' />
      <View className='hotel-order-skeleton-line' />
      <View className='hotel-order-skeleton-line' />
      <View className='hotel-order-skeleton-footer'>
        <View className='hotel-order-skeleton-line tiny' />
        <View className='hotel-order-skeleton-line price' />
      </View>
    </View>
  ))
}

function OrderList({
  list,
  total,
  summaryText,
  hasMore,
  loading,
  refreshing,
  pullLabel,
  onLoadMore,
  onRefresh,
  onPulling,
  onPullEnd,
  onScrollChange,
  onPay
}) {
  const isInitialLoading = loading && list.length === 0 && !refreshing
  const showBottomSkeleton = loading && list.length > 0 && hasMore
  const showEmpty = !loading && !refreshing && list.length === 0

  return (
    <View className='hotel-order-list'>
      <ScrollView
        className='hotel-order-scroll'
        scrollY
        enhanced
        showScrollbar={false}
        lowerThreshold={120}
        onScrollToLower={() => onLoadMore && onLoadMore()}
        onScroll={(event) => onScrollChange && onScrollChange(Number(event?.detail?.scrollTop) || 0)}
        refresherEnabled
        refresherThreshold={72}
        refresherTriggered={refreshing}
        onRefresherRefresh={() => onRefresh && onRefresh()}
        onRefresherPulling={onPulling}
        onRefresherRestore={onPullEnd}
        onRefresherAbort={onPullEnd}
      >
        <View className={`hotel-order-pull ${pullLabel ? 'visible' : ''} ${refreshing ? 'loading' : ''}`}>
          <View className='hotel-order-pull-dot' />
          <Text className='hotel-order-pull-text'>{pullLabel || ' '}</Text>
        </View>

        {isInitialLoading ? renderSkeletonCards(4, 'initial') : null}

        {list.length > 0 ? (
          <View className='hotel-order-cards'>
            {list.map((item, index) => (
              <OrderCard key={getOrderKey(item, index)} order={item} onPay={onPay} />
            ))}
          </View>
        ) : null}

        {showBottomSkeleton ? (
          <View className='hotel-order-bottom-skeleton'>
            {renderSkeletonCards(2, 'more')}
          </View>
        ) : null}

        {showEmpty ? (
          <View className='hotel-order-empty'>
            <Empty description='暂无订单' />
          </View>
        ) : null}

        <View className='hotel-order-footer'>
          {list.length > 0 ? (
            <View className='hotel-order-total-pill'>
              <Text className='hotel-order-total-pill-text'>{summaryText || `共 ${total} 条订单`}</Text>
            </View>
          ) : null}

          <Text className='hotel-order-load-tip'>
            {hasMore ? (loading ? '正在加载更多订单...' : '上拉加载更多订单') : (list.length > 0 ? '已全部加载完成' : '')}
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

export default memo(OrderList)
