# 移动端动效与列表/卡片封装说明

本文档说明移动端列表与卡片的动效实现原理、交互机制与封装结构，强调稳定的行为描述，避免依赖具体文件路径或行号。

## 1. 设计目标
- 统一酒店/收藏/订单列表的滚动交互与加载体验
- 统一列表分步入场动效的触发与节奏
- 保持卡片视觉风格一致，结构按业务字段区分

## 2. 列表容器封装
核心容器以“统一滚动列表”为目标：集中处理滚动、下拉刷新、上拉加载、骨架屏与入场动效，业务页面只负责数据与回调。

示例结构：

```jsx
function ListContainer({
  items = [],
  renderItem,
  hasMore = false,
  loading = false,
  refreshing = false,
  onLoadMore,
  onRefresh,
  onPulling,
  onPullEnd,
  animate = false
}) {
  return (
    <ScrollView
      scrollY
      lowerThreshold={120}
      onScrollToLower={() => {
        if (hasMore && !loading && onLoadMore) {
          onLoadMore()
        }
      }}
      refresherEnabled={!!onRefresh || !!onPulling || !!onPullEnd}
      refresherTriggered={refreshing}
      onRefresherRefresh={() => onRefresh && onRefresh()}
      onRefresherPulling={onPulling}
      onRefresherRestore={onPullEnd}
      onRefresherAbort={onPullEnd}
    >
      <View className="list-items">
        {items.map((item, index) => {
          const delay = animate ? `${Math.min(index, 10) * 20}ms` : '0ms'
          return (
            <View
              key={index}
              className={`list-item${animate ? ' list-stagger-enter' : ''}`}
              style={animate ? { animationDelay: delay } : undefined}
            >
              {renderItem ? renderItem(item, index) : null}
            </View>
          )
        })}
      </View>
    </ScrollView>
  )
}
```

### 2.1 列表类型工厂
列表通过类型分发渲染卡片：
- 订单列表：渲染订单卡片
- 收藏列表：渲染酒店卡片，并支持滑动取消收藏
- 酒店列表：渲染酒店卡片

示例结构：

```jsx
function createListByType({ type, items, onOpen, onRemove, onPay, onDetail, enableSwipe = true, ...rest }) {
  if (type === 'order') {
    return (
      <ListContainer
        items={items}
        renderItem={(order) => (
          <OrderCard order={order} onPay={onPay} onDetail={onDetail} />
        )}
        {...rest}
      />
    )
  }

  if (type === 'favorite') {
    return (
      <ListContainer
        items={items}
        renderItem={(hotel) => {
          const card = <HotelCard hotel={hotel} onClick={() => onOpen && onOpen(hotel?.id)} />
          return enableSwipe ? (
            <SwipeAction rightActions={[{ key: 'remove', text: '取消收藏', onClick: () => onRemove && onRemove(hotel?.id) }]}>
              {card}
            </SwipeAction>
          ) : card
        }}
        {...rest}
      />
    )
  }

  return (
    <ListContainer
      items={items}
      renderItem={(hotel) => (
        <HotelCard hotel={hotel} onClick={() => onOpen && onOpen(hotel?.id)} />
      )}
      {...rest}
    />
  )
}
```

### 2.2 下拉刷新原理
容器在 H5 环境下监听触摸并结合 ScrollView 的 refresher 能力：
- 按下记录起始触点，进入拉取状态
- 移动过程中计算拉取距离并回调拉取进度
- 松手后若超过阈值触发刷新，否则结束拉取

示例结构：

```jsx
const startYRef = useRef(0)
const pullingRef = useRef(false)
const lastDyRef = useRef(0)

const handleTouchStart = (event) => {
  const touch = event?.touches?.[0]
  if (!touch) return
  startYRef.current = touch.clientY
  pullingRef.current = true
  lastDyRef.current = 0
}

const handleTouchMove = (event) => {
  if (!pullingRef.current) return
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
  if (!pullingRef.current) return
  pullingRef.current = false
  const dy = lastDyRef.current
  if (dy >= pullThreshold) {
    onRefresh && onRefresh()
    return
  }
  onPullEnd && onPullEnd()
}
```

### 2.3 上拉加载原理
滚动触底时触发加载：
- 只有在“还有更多数据”且“不在加载中”时触发加载回调
- 触发阈值由容器统一控制，避免频繁抖动

示例结构：

```jsx
<ScrollView
  scrollY
  lowerThreshold={120}
  onScrollToLower={() => {
    if (hasMore && !loading && onLoadMore) {
      onLoadMore()
    }
  }}
/>
```

### 2.4 骨架屏与空态
容器统一处理以下状态：
- 初始加载：展示骨架屏占位
- 分页加载：列表底部继续展示骨架
- 空列表：统一空态容器与文案

示例结构：

```jsx
{loading && items.length === 0 ? (
  <View className="list-items">
    {renderSkeleton(4, 'initial')}
  </View>
) : null}

{items.length === 0 && !loading ? (
  <View className="list-empty">
    <Empty description={emptyText} />
  </View>
) : null}
```

## 3. 动效实现原理
分步入场动效由列表容器统一控制，卡片不再自带入场动画，避免重复或不一致。

### 3.1 动效触发机制
当列表开启动效时：
- 每个列表项会获得统一的“入场动效”标识
- 动画延迟随索引递增，形成由上到下的分步入场
- 最大延迟被限制，避免列表过长导致等待过久

示例结构：

```jsx
const delay = animate ? `${Math.min(index, 10) * 20}ms` : '0ms'
<View
  className={`list-item${animate ? ' list-stagger-enter' : ''}`}
  style={animate ? { animationDelay: delay } : undefined}
/>
```

### 3.2 动效样式定义
动效采用轻微位移与缩放的组合，强化“自然出现”的观感：
- 起始状态：透明、轻微下移、略缩小
- 结束状态：完全不透明、回到原位、恢复大小

示例结构：

```css
.list-item.list-stagger-enter {
  animation: list-item-enter 0.22s ease-out both;
}

@keyframes list-item-enter {
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.995);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

### 3.3 下拉反馈动效
下拉反馈以“点状缩放”作为可触发提示：
- 拉取不足时显示基础状态
- 达到阈值时进入“可释放”状态
- 刷新中进入循环缩放动画

示例结构：

```css
.list-pull-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #1677ff;
}

.list-pull.loading .list-pull-dot {
  animation: list-pull-dot 0.9s linear infinite;
}

@keyframes list-pull-dot {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.45; }
  100% { transform: scale(1); opacity: 1; }
}
```

## 4. 卡片封装
卡片按业务拆分为“酒店卡片”和“订单卡片”，并统一基础视觉风格（圆角、边框、字体色板、按钮色板）。

### 4.1 酒店卡片（酒店/收藏）
用途：酒店列表与收藏列表的卡片渲染。

结构重点：
- 主图 + 基本信息 + 元信息标签 + 价格区块
- 收藏页附加收藏标识与收藏时间信息

示例结构：

```jsx
function HotelCard({ hotel, badgeText, extraMetaItems = [], onClick }) {
  const metaItems = [
    hotel?.star_rating ? `${hotel.star_rating}星级` : '暂无评级',
    hotel?.opening_time ? `${String(hotel.opening_time).slice(0, 4)}年开业` : '',
    ...extraMetaItems
  ].filter(Boolean)

  return (
    <View className="hotel-card" onClick={onClick}>
      <View className="hotel-card-main">
        <Image className="hotel-card-image" mode="aspectFill" src={hotel?.cover_image || ''} />
        <View className="hotel-card-info">
          <View className="hotel-card-title-row">
            <Text className="hotel-card-name">{hotel?.name || '酒店'}</Text>
            {badgeText ? <View className="hotel-card-badge"><Text>{badgeText}</Text></View> : null}
          </View>
          <View className="hotel-card-meta">
            {metaItems.map((item) => <Text key={item} className="hotel-card-meta-item">{item}</Text>)}
          </View>
          <View className="hotel-card-bottom">
            <View className="hotel-card-price">
              <Text className="hotel-card-price-symbol">¥</Text>
              <Text className="hotel-card-price-value">{hotel?.lowestPrice || '-'}</Text>
              <Text className="hotel-card-price-suffix">起</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}
```

### 4.2 订单卡片（订单）
用途：订单列表的卡片渲染。

结构重点：
- 顶部：酒店名 + 订单状态
- 中部：入住/离店、房型、间夜数
- 底部：订单号、下单时间、总价、去支付按钮

示例结构：

```jsx
function OrderCard({ order, onPay, onDetail }) {
  const canPay = order?.status === 'pending_payment'
  return (
    <View className="hotel-order-card" onClick={() => onDetail && onDetail(order)}>
      <View className="hotel-order-top">
        <Text className="hotel-order-name">{order?.hotel_name || '酒店'}</Text>
        <Text className="hotel-order-status">{order?.status || '未知'}</Text>
      </View>
      <View className="hotel-order-meta">
        <View className="hotel-order-meta-row">
          <Text className="hotel-order-label">入住日期</Text>
          <Text className="hotel-order-value">{order?.check_in} - {order?.check_out}</Text>
        </View>
      </View>
      <View className="hotel-order-bottom">
        <Text className="hotel-order-price">¥{order?.total_price || 0}</Text>
        {canPay ? (
          <View className="hotel-order-pay-btn" onClick={(event) => { event?.stopPropagation?.(); onPay && onPay(order) }}>
            <Text className="hotel-order-pay-text">去支付</Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}
```

## 5. 列表与卡片的协作关系
- 列表容器负责滚动交互、刷新/加载状态、骨架屏与入场动效
- 卡片负责业务字段渲染与局部交互（如订单支付按钮、收藏滑动删除）
- 动效只由列表容器控制，卡片保持结构与视觉样式

## 6. 复用入口与调用方式
酒店、订单、收藏三类列表均通过“列表类型工厂”创建，业务页面只需传入类型与数据，即可获得统一交互与动效。

## 7. 维护建议
- 动效节奏与交互建议集中在“列表容器”进行维护
- 卡片视觉统一在“酒店卡片/订单卡片”层维护
- 避免在卡片内部新增入场动画，保持动效唯一入口
