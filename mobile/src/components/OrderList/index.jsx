import { memo, useRef } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import { Empty, SwipeAction } from 'antd-mobile'
import OrderCard from '../OrderCard'
import HotelCard from '../HotelCard'
import './index.css'

const getOrderKey = (order, index) => {
  if (order?.id !== undefined && order?.id !== null) {
    return `order-${order.id}`
  }
  return `order-fallback-${order?.created_at || ''}-${order?.hotel_id || ''}-${index}`
}

const renderOrderSkeletonCards = (count, prefix) => {
  return Array.from({ length: count }).map((_, idx) => (
    <View key={`${prefix}-${idx}`} className='list-skeleton-card'>
      <View className='list-skeleton-line title' />
      <View className='list-skeleton-line short' />
      <View className='list-skeleton-line' />
      <View className='list-skeleton-line' />
      <View className='list-skeleton-footer'>
        <View className='list-skeleton-line tiny' />
        <View className='list-skeleton-line price' />
      </View>
    </View>
  ))
}

function ListContainer({
  items = [],
  renderItem,
  keyExtractor,
  total,
  summaryText,
  showSummary = false,
  hasMore = false,
  loading = false,
  refreshing = false,
  pullLabel,
  pullDistance,
  pullThreshold = 72,
  onLoadMore,
  onRefresh,
  onPulling,
  onPullEnd,
  onScrollChange,
  emptyText = '暂无数据',
  showEmpty = true,
  renderSkeleton,
  initialSkeletonCount = 4,
  moreSkeletonCount = 2,
  header,
  footer,
  loadTipText,
  containerClassName,
  scrollClassName,
  listClassName
}) {
  const isH5 = typeof window !== 'undefined' && typeof document !== 'undefined'
  const startYRef = useRef(0)
  const pullingRef = useRef(false)
  const lastDyRef = useRef(0)
  const scrollTopRef = useRef(0)
  const data = Array.isArray(items) ? items : []
  const isInitialLoading = loading && data.length === 0 && !refreshing
  const showBottomSkeleton = loading && data.length > 0 && hasMore
  const shouldShowEmpty = showEmpty && !loading && !refreshing && data.length === 0
  const enablePull = !!onRefresh || !!onPulling || !!onPullEnd
  const safePullDistance = Math.max(Number(pullDistance) || 0, 0)
  const progress = pullThreshold > 0 ? Math.min(safePullDistance / pullThreshold, 1) : 0
  const visible = enablePull && (refreshing || safePullDistance > 0)
  const pullHeight = visible ? Math.min(60, 20 + safePullDistance * 0.4) : 0
  const computedSummaryText = summaryText || (typeof total === 'number' ? `共 ${total} 条` : '')
  const computedLoadTipText = loadTipText ?? (hasMore
    ? (loading ? '正在加载更多...' : '上拉加载更多...')
    : (data.length > 0 ? '已全部加载完成' : ''))
  const resolveKey = keyExtractor || ((item, index) => {
    if (item?.id !== undefined && item?.id !== null) {
      return `item-${item.id}`
    }
    return `item-${index}`
  })

  const handleTouchStart = (event) => {
    if (!enablePull || !isH5 || refreshing) return
    if (scrollTopRef.current > 0) return
    const touch = event?.touches?.[0]
    if (!touch) return
    startYRef.current = touch.clientY
    pullingRef.current = true
    lastDyRef.current = 0
  }

  const handleTouchMove = (event) => {
    if (!enablePull || !pullingRef.current || refreshing) return
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
    if (!enablePull || !pullingRef.current || refreshing) return
    pullingRef.current = false
    const dy = lastDyRef.current
    if (dy >= pullThreshold) {
      onRefresh && onRefresh()
      return
    }
    onPullEnd && onPullEnd()
  }

  return (
    <View className={`list-container${containerClassName ? ` ${containerClassName}` : ''}`}>
      <ScrollView
        className={`list-scroll${scrollClassName ? ` ${scrollClassName}` : ''}`}
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
        refresherEnabled={enablePull}
        refresherThreshold={72}
        refresherTriggered={refreshing}
        onRefresherRefresh={() => onRefresh && onRefresh()}
        onRefresherPulling={onPulling}
        onRefresherRestore={onPullEnd}
        onRefresherAbort={onPullEnd}
        onTouchStart={enablePull ? handleTouchStart : undefined}
        onTouchMove={enablePull ? handleTouchMove : undefined}
        onTouchEnd={enablePull ? handleTouchEnd : undefined}
      >
        {enablePull ? (
          <View
            className={`list-pull ${visible ? 'visible' : ''} ${refreshing ? 'loading' : ''} ${progress >= 1 ? 'ready' : ''}`}
            style={{ height: `${pullHeight}px`, opacity: visible ? 1 : 0 }}
          >
            <View className='list-pull-dot' style={{ transform: `scale(${0.6 + progress * 0.6})` }} />
            <Text className='list-pull-text'>{pullLabel || ' '}</Text>
          </View>
        ) : null}

        {header}

        {isInitialLoading && renderSkeleton ? (
          <View className='list-items'>
            {renderSkeleton(initialSkeletonCount, 'initial')}
          </View>
        ) : null}

        {data.length > 0 ? (
          <View className={`list-items${listClassName ? ` ${listClassName}` : ''}`}>
            {data.map((item, index) => (
              <View key={resolveKey(item, index)}>
                {renderItem ? renderItem(item, index) : null}
              </View>
            ))}
          </View>
        ) : null}

        {showBottomSkeleton && renderSkeleton ? (
          <View className='list-items list-bottom-skeleton'>
            {renderSkeleton(moreSkeletonCount, 'more')}
          </View>
        ) : null}

        {shouldShowEmpty ? (
          <View className='list-empty'>
            <Empty description={emptyText} />
          </View>
        ) : null}

        {footer !== null ? (
          <View className='list-footer'>
            {showSummary && computedSummaryText ? (
              <View className='list-total-pill'>
                <Text className='list-total-pill-text'>{computedSummaryText}</Text>
              </View>
            ) : null}
            {computedLoadTipText ? (
              <Text className='list-load-tip'>{computedLoadTipText}</Text>
            ) : null}
            {footer}
          </View>
        ) : null}
      </ScrollView>
    </View>
  )
}

export const createListByType = ({
  type,
  items,
  onOpen,
  onRemove,
  onPay,
  onDetail,
  enableSwipe = true,
  badgeText,
  animate = true,
  extraMetaItemsResolver,
  emptyText,
  ...rest
}) => {
  if (type === 'order') {
    return (
      <ListContainer
        items={items}
        emptyText={emptyText || '暂无订单'}
        renderSkeleton={renderOrderSkeletonCards}
        keyExtractor={getOrderKey}
        renderItem={(order, index) => (
          <OrderCard
            order={order}
            onPay={onPay}
            onDetail={onDetail}
            index={index}
            animate={animate}
          />
        )}
        {...rest}
      />
    )
  }

  if (type === 'favorite') {
    return (
      <ListContainer
        items={items}
        showSummary={false}
        emptyText={emptyText || '暂无收藏酒店'}
        renderItem={(hotel, index) => {
          const extraMetaItems = extraMetaItemsResolver ? extraMetaItemsResolver(hotel) : []
          const cardNode = (
            <HotelCard
              hotel={hotel}
              index={index}
              animate={animate}
              badgeText={badgeText}
              extraMetaItems={extraMetaItems}
              onClick={() => onOpen && onOpen(hotel?.id)}
            />
          )
          return enableSwipe ? (
            <SwipeAction
              className='list-swipe'
              rightActions={[
                {
                  key: 'remove',
                  text: '取消收藏',
                  color: 'danger',
                  onClick: () => onRemove && onRemove(hotel?.id)
                }
              ]}
            >
              {cardNode}
            </SwipeAction>
          ) : cardNode
        }}
        {...rest}
      />
    )
  }

  return (
    <ListContainer
      items={items}
      showSummary={false}
      emptyText={emptyText || '暂无符合条件的酒店'}
      renderItem={(hotel, index) => (
        <HotelCard
          hotel={hotel}
          index={index}
          animate={animate}
          onClick={() => onOpen && onOpen(hotel?.id)}
        />
      )}
      {...rest}
    />
  )
}

export default memo(ListContainer)
