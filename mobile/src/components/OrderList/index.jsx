import { memo, useRef } from 'react'
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
  pullDistance,
  pullThreshold = 72,
  onLoadMore,
  onRefresh,
  onPulling,
  onPullEnd,
  onScrollChange,
  onPay,
  onDetail
}) {
  const isH5 = typeof window !== 'undefined' && typeof document !== 'undefined'
  const startYRef = useRef(0)
  const pullingRef = useRef(false)
  const lastDyRef = useRef(0)
  const scrollTopRef = useRef(0)
  const isInitialLoading = loading && list.length === 0 && !refreshing
  const showBottomSkeleton = loading && list.length > 0 && hasMore
  const showEmpty = !loading && !refreshing && list.length === 0
  const safePullDistance = Math.max(Number(pullDistance) || 0, 0)
  const progress = pullThreshold > 0 ? Math.min(safePullDistance / pullThreshold, 1) : 0
  const visible = refreshing || safePullDistance > 0
  const pullHeight = visible ? Math.min(60, 20 + safePullDistance * 0.4) : 0

  const handleTouchStart = (event) => {
    if (!isH5 || refreshing) return
    if (scrollTopRef.current > 0) return
    const touch = event?.touches?.[0]
    if (!touch) return
    startYRef.current = touch.clientY
    pullingRef.current = true
    lastDyRef.current = 0
  }

  const handleTouchMove = (event) => {
    if (!pullingRef.current || refreshing) return
    const touch = event?.touches?.[0]
    if (!touch) return
    const dy = touch.clientY - startYRef.current
    if (dy <= 0) {
      lastDyRef.current = 0
      return
    }
    lastDyRef.current = dy
    onPulling && onPulling(dy)
  }

  const handleTouchEnd = () => {
    if (!pullingRef.current || refreshing) return
    pullingRef.current = false
    const dy = lastDyRef.current
    if (dy >= pullThreshold) {
      onRefresh && onRefresh()
      return
    }
    onPullEnd && onPullEnd()
  }

  return (
    <View className='hotel-order-list'>
      <ScrollView
        className='hotel-order-scroll'
        scrollY
        enhanced
        showScrollbar={false}
        lowerThreshold={120}
        onScrollToLower={() => {
          if (hasMore && !loading && onLoadMore) {
            onLoadMore()
          }
        }}
        onScroll={(event) => {
          const nextTop = Number(event?.detail?.scrollTop) || 0
          scrollTopRef.current = nextTop
          onScrollChange && onScrollChange(nextTop)
        }}
        refresherEnabled
        refresherThreshold={72}
        refresherTriggered={refreshing}
        onRefresherRefresh={() => onRefresh && onRefresh()}
        onRefresherPulling={onPulling}
        onRefresherRestore={onPullEnd}
        onRefresherAbort={onPullEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <View
          className={`hotel-order-pull ${visible ? 'visible' : ''} ${refreshing ? 'loading' : ''} ${progress >= 1 ? 'ready' : ''}`}
          style={{ height: `${pullHeight}px`, opacity: visible ? 1 : 0 }}
        >
          <View className='hotel-order-pull-dot' style={{ transform: `scale(${0.6 + progress * 0.6})` }} />
          <Text className='hotel-order-pull-text'>{pullLabel || ' '}</Text>
        </View>

        {isInitialLoading ? (
          <View className='hotel-order-cards'>
            {renderSkeletonCards(4, 'initial')}
          </View>
        ) : null}

        {list.length > 0 ? (
          <View className='hotel-order-cards'>
            {list.map((item, index) => (
              <OrderCard
                key={getOrderKey(item, index)}
                order={item}
                onPay={onPay}
                onDetail={onDetail}
                index={index}
                animate
              />
            ))}
          </View>
        ) : null}

        {showBottomSkeleton ? (
          <View className='hotel-order-cards hotel-order-bottom-skeleton'>
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
