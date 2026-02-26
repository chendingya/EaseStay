# 移动端用户体验设计文档

> 本文档系统梳理易宿酒店移动端（Taro + React + H5）在用户体验层面的设计考量与实现细节，涵盖动效体系、加载策略、交互反馈、视觉一致性、无障碍等方面。

---

## 目录

1. [动效体系](#1-动效体系)
2. [加载状态与骨架屏](#2-加载状态与骨架屏)
3. [毛玻璃设计体系](#3-毛玻璃-glassmorphism-设计体系)
4. [交互反馈机制](#4-交互反馈机制)
5. [地图找房体验优化](#5-地图找房体验优化)
6. [图片优化策略](#6-图片优化策略)
7. [错误处理与用户提示](#7-错误处理与用户提示)
8. [表单交互设计](#8-表单交互设计)
9. [CSS 变量与视觉一致性](#9-css-变量与视觉一致性)
10. [无障碍与安全区域](#10-无障碍与安全区域)
11. [性能优化技术](#11-性能优化技术)

---

## 1. 动效体系

### 1.1 页面转场动画

所有页面自动获得入场动画，使用 `page-enter` keyframe：

- 时长 0.28s，`ease` 缓动
- 效果：`opacity 0→1`、`scale(0.98→1)`、`filter: blur(6px→0)`
- 使用 `will-change: transform, opacity, filter` 开启 GPU 硬件加速
- 实现位置：`app.css` 中 `.taro_page` 全局样式

### 1.2 列表分步入场（Stagger Enter）

统一列表容器 `ListContainer` 支持 `animate` prop，开启后列表项交错入场：

- keyframe `list-item-enter`：`translateY(6px) scale(0.995)` → `translateY(0) scale(1)`
- 时长 0.22s，`ease-out` 缓动
- 延迟递增：`animationDelay = Math.min(index, 10) * 20ms`，最多前 10 项有递增延迟
- 适用范围：酒店列表、订单列表、收藏列表、房型列表

### 1.3 下拉刷新反馈动效

- 圆点脉冲：`list-pull-dot` keyframe，`scale(1) → scale(1.4) → scale(1)` + opacity 脉冲，周期 0.9s
- 拉取指示器：从 `translateY(-6px) opacity:0` 过渡到 `translateY(0) opacity:1`（0.1s）
- 文案随状态变化：「下拉刷新」→「松手立即刷新」→「正在刷新…」

### 1.4 Hero 大图展开动画

酒店详情页 Hero 区域支持手势下拉展开：

- 高度从 `280px` → `75vh`，`transition: height 0.42s cubic-bezier(0.4, 0, 0.2, 1)`
- 触发条件：scrollTop ≤ 2 时下拉超过 60px 阈值
- 背景模糊层 `opacity 0.45s ease` 淡入淡出
- 向下滚动超 60px 自动收起

### 1.5 按钮点击反馈

| 组件 | 效果 | 时长 |
|------|------|------|
| GlassButton | `scale(0.98) opacity:0.85` + spinner 旋转 | 0.18s |
| RoomTypeCard 预订按钮 | `scale(0.98) opacity:0.76` + loading | 0.16s |
| antd-mobile 按钮（全局覆盖） | `scale(0.98) opacity:0.75` + filter | 0.18s |

### 1.6 导航栏滚动感知

- 详情页顶栏：透明 → 不透明渐变，`navOpacity = Math.min(scrollTop / 150, 1)` 实时计算
- `PageTopBar` 组件：`transition: box-shadow 0.2s ease, background-color 0.2s ease`
- `.elevated` 状态在 opacity ≥ 0.6 时激活阴影 `box-shadow: 0 8px 24px rgba(23,42,68,0.1)`

### 1.7 地图价格气泡动效

- `transition: transform 0.15s, background 0.15s`
- 激活时 `scale(1.1)` + 颜色切换 `#1677ff → #0052cc` + `zIndex 200 → 300`

---

## 2. 加载状态与骨架屏

### 2.1 设计原则

- **首次加载**使用骨架屏完整占位，避免白屏和布局跳动
- **后续刷新**保留旧数据静默更新，不展示骨架屏（如详情页切换日期、收藏页返回）
- **加载更多**在列表底部追加小型骨架卡片，保持滚动连贯

### 2.2 骨架屏矩阵

| 页面 | 骨架类型 | shimmer 动画 | 说明 |
|------|---------|-------------|------|
| 首页 | 快捷标签骨架 + 瀑布流卡片骨架 | 1.4s ease-in-out | 图片占位 + 文字行占位 |
| 酒店详情 | Hero(280px) + 信息卡 + 日期 + 房型 | 1.4s ease-in-out | 完整页面骨架 |
| 订单列表 | 线条型订单卡骨架 | 1.2s ease-in-out | 标题/短行/全行/价格 |
| 收藏列表 | 左缩略图 + 右信息骨架 | 1.2s ease-in-out | 酒店卡片形态 |
| 个人中心 | 用户名占位骨架 | 1.2s ease-in-out | 头部信息区 |
| 地图找房 | 半透明加载遮罩 | 无 | `rgba(255,255,255,0.7)` + 文字气泡 |

### 2.3 按钮 Loading 态

所有表单提交按钮（登录 / 注册 / 预订 / 支付 / 取消订单 / 确认使用）均支持 `loading` prop：
- 按钮禁用，防止重复提交
- spinner 旋转动画 `0.8s linear infinite`
- 缩放 + 降低不透明度视觉反馈

---

## 3. 毛玻璃 (Glassmorphism) 设计体系

### 3.1 GlassToast 全局通知系统

**架构**：Pub/Sub 模式

```
glassToast.success/error/warning/info()
  → dispatchToast()
    → subscribeGlassToast()
      → GlassToastHost 渲染
```

**视觉参数**：
- `backdrop-filter: blur(10px)`
- `background: rgba(245,249,255,0.74)`
- `border: 1px solid rgba(255,255,255,0.38)`
- `box-shadow: 0 10px 24px rgba(21,45,84,0.18)`

**交互细节**：
- Enter：`translateY(-8px) scale(0.98) opacity:0` → `translateY(0) scale(1) opacity:1`（0.22s ease）
- Leave：反向动画
- 队列管理：最多同时展示 4 条，超出自动裁剪
- 每条默认 2200ms 自动消失
- H5 专属：仅 H5 环境激活毛玻璃版本，非 H5 回退到 `Taro.showToast`

**图标映射**：success ✓（绿）、error ✕（红）、warning ！（橙）、info ⓘ（蓝）

### 3.2 GlassButton 毛玻璃按钮

- CSS 变量驱动三种色调：`default`（蓝灰）、`primary`（蓝色）、`danger`（红色）
- 三种填充：`solid` / `outline` / `none`
- 四种尺寸：`mini(24px)` / `small(28px)` / `middle(32px)` / `large(36px)`
- `backdrop-filter: blur(10px)` + 半透明背景

### 3.3 毛玻璃应用范围

| 组件/区域 | blur | background |
|-----------|------|-----------|
| PageTopBar 导航栏 | 10px | rgba(255,255,255,0.94) |
| BookingBottomBar 预订栏 | 10px | rgba(255,255,255,0.9) |
| 详情页 glass-card | 10px | rgba(255,255,255,0.85) |
| 详情页 Hero 下拉提示 | 6px | rgba(255,255,255,0.15) |
| 详情页房型标签 | 8px | 半透明 |
| 房型详情骨架 | 10px | 半透明 |

---

## 4. 交互反馈机制

### 4.1 下拉刷新 (Pull-to-Refresh)

自定义 H5 触摸实现，不依赖原生 WebView 刷新：

- `onTouchStart` 记录起始 Y → `onTouchMove` 计算 deltaY → `onTouchEnd` 判断是否超过阈值
- 视觉反馈：缩放圆点 + 文字提示状态变化
- 应用页面：订单列表

### 4.2 上拉无限加载 (Infinite Scroll)

- `ScrollView onScrollToLower`，`lowerThreshold=120` 提前触发
- 底部显示骨架卡片 + 文案：「正在加载更多…」/「上拉加载更多…」/「已全部加载完成」
- 应用页面：列表页、订单页、收藏页、首页热门推荐

### 4.3 滑动删除 (Swipe-to-Delete)

- 使用 antd-mobile `SwipeAction` 组件
- 应用：收藏列表左滑显示「取消收藏」按钮
- 二次确认：`Dialog.confirm` 防误操作

### 4.4 Hero 下拉展开交互

- 技术：Touch 手势检测，在 scrollTop ≤ 2 时启用
- 下拉超 60px → 展开至 75vh
- 向下滚动超 60px → 自动收起
- 视觉提示：底部半透明标签「下拉查看大图」

### 4.5 地图卡片联动

- 点击地图气泡 → 底部卡片 `scrollIntoView({ behavior: 'smooth', inline: 'center' })`
- 点击底部卡片 → 地图 `setCenter` 居中 + 气泡高亮
- 底部卡片 `scroll-snap-type: x mandatory` + `scroll-snap-align: start` 吸附

### 4.6 导航栏阴影感知

- 详情页：`navOpacity = Math.min(scrollTop/150, 1)` 平滑过渡
- 订单页：`onScrollChange(scrollTop)` → `setIsHeaderElevated(scrollTop > 8)` 控制阴影

### 4.7 列表页双阶段加载

- **阶段一**：按搜索条件分页加载搜索结果
- **阶段二**：搜索结果加载完毕后，自动接续加载推荐酒店
- 两阶段共享一个滚动容器，无缝衔接

---

## 5. 地图找房体验优化

### 5.1 POI 搜索建议

- 400ms 防抖输入 → 高德 POI API → 最多展示 8 条建议
- 选择 POI 后：📍标记 + 所有酒店按距离排序 + 解锁「距离排序」选项
- 清除搜索时，如当前为距离排序则自动回退到推荐排序

### 5.2 搜索建议与筛选互斥

为防止搜索建议列表被筛选下拉遮挡：

- **z-index 层级**：搜索建议 `z-index: 1100`，高于 antd-mobile Dropdown（~1050）
- **互斥逻辑**：输入/聚焦时关闭筛选下拉；点击筛选栏时关闭搜索建议
- **遮罩隔离**：搜索建议显示时添加半透明遮罩层（z-index: 1099），阻止下层交互

### 5.3 五维排序体系

| 排序值 | 名称 | 条件 | 说明 |
|--------|------|------|------|
| `recommend` | 推荐排序 | 无 | 默认；有 POI 时按距离排 |
| `distance` | 距离从近到远 | 需先搜索目的地 | 未选 POI 时 disabled + 灰色提示 |
| `price_asc` | 价格低到高 | 无 | — |
| `price_desc` | 价格高到低 | 无 | — |
| `star` | 星级高到低 | 无 | — |

### 5.4 排序/筛选后列表归位

- 监听 `hotels` 数据变化，在 `requestAnimationFrame` 回调中将底部卡片列表 `scrollLeft` 归零
- 确保新数据渲染完成后再归位，避免滚动被后续渲染覆盖

### 5.5 视野自适应

- 数据加载后 `setFitView(null, false, [60,60,200,60], 16)` 自动适配所有标记
- 提供「回到目的地」按钮，一键 `setCenter + setZoom(14)` 返回 POI

---

## 6. 图片优化策略

### 6.1 服务端图片代理

`resolveImageUrl(url, { width, height, quality, format })` 将原始图片 URL 转换为代理 URL：

```
/api/image?url=原始地址&w=112&h=132&q=70&fmt=webp
```

支持按需指定尺寸、质量、格式（默认 webp），由 Server 端 Sharp 库实时压缩。

### 6.2 各场景尺寸适配

| 组件 | 宽×高 | 质量 | 说明 |
|------|-------|------|------|
| HotelCard 封面 | 112×132 | 70 | 列表缩略图 |
| RoomTypeCard 封面 | 84×84 | 70 | 房型小图 |
| 地图卡片封面 | 200×120 | 70 | 横向卡片 |
| Hero 背景（模糊） | 原宽 | 40 | 低质量用于 blur |
| Hero 主图 | 原宽 | 80 | 高质量展示 |

### 6.3 懒加载策略

- Taro Image：`<Image lazyLoad />`（HotelCard、RoomTypeCard、首页热门卡片）
- 房型详情 Swiper：`lazyLoad={idx > 0}` 仅首图即时加载
- 地图卡片：`<img loading="lazy" />` 原生 HTML 懒加载

### 6.4 图片错误降级

所有图片组件均有 `onError` + `imageFailed` 状态，失败时显示渐变 placeholder 背景，不展示破损图标。

---

## 7. 错误处理与用户提示

### 7.1 统一 API 错误

- 所有 API 错误在 `request.js` 中自动通过 `glassToast.error(msg)` 展示
- 防重复：`__toastShown` 标记 + 页面层二次检查 `if (!error?.__toastShown)`

### 7.2 业务级反馈

| 类型 | 示例 |
|------|------|
| success | 登录成功、注册成功、收藏成功、支付成功、分享链接已复制 |
| warning | 该房型已售罄、请先登录后下单、请先选择入住和离店日期 |
| error | 操作失败请稍后重试、复制失败 |

全部使用 `glassToast` 统一风格，覆盖 10+ 个页面。

### 7.3 确认对话框

- 收藏页：`Dialog.confirm({ content: '确认取消收藏该酒店吗？' })`
- 防止关键操作（取消收藏、清空）的误触

---

## 8. 表单交互设计

### 8.1 验证码倒计时

- 点击后 60 秒倒计时：`setCountdown(60)`，每秒递减
- 按钮文案动态更新：`countdown > 0 ? '${countdown}s' : '获取验证码'`
- `disabled={countdown > 0 || sendingCode}` 锁定按钮
- `sendingCodeRef` 防并发请求

### 8.2 登录模式切换

- 验证码登录 / 密码登录 两种模式
- `role='tablist'` 语义标记
- 动态字段切换（code 输入框 ↔ password 输入框）

### 8.3 表单验证

- antd-mobile `Form.Item` 的 `rules` 属性声明式校验
- 密码确认：`validator` 函数判断两次密码一致性

### 8.4 提交防重复

所有表单提交按钮 `loading={loading}` 禁用重复点击；预订按钮精确到单个房型 `booking={bookingRoomId === room.id}`。

---

## 9. CSS 变量与视觉一致性

### 9.1 全局 CSS 变量

```css
--app-primary-start: #0086f6;
--app-primary-end: #2db7f5;
--app-primary-solid: #1a6dff;
--app-primary-border: #b7d5ff;
--app-bottom-nav-height: 58px;
--app-safe-area-bottom: env(safe-area-inset-bottom, 0px);
```

antd-mobile 主题色覆盖：`--adm-color-primary: var(--app-primary-solid)`

### 9.2 统一视觉规范

| 属性 | 规范值 |
|------|--------|
| 页面背景色 | `#f5f7fb` |
| 卡片圆角 | 12px（通用卡片）、16px（酒店卡片）、20px（气泡/搜索框） |
| 按钮圆角 | 14px（玻璃按钮/输入框） |
| 阴影-轻 | `0 2px 8px rgba(...)` |
| 阴影-中 | `0 6px 16px rgba(...)` |
| 阴影-重 | `0 10px 24px rgba(...)` |
| 主按钮渐变 | `linear-gradient(90deg, #0086F6, #2db7f5)` |

---

## 10. 无障碍与安全区域

### 10.1 ARIA 标记

| 组件 | 标记 |
|------|------|
| GlobalBottomNav | `role='navigation' aria-label='主导航'` |
| 首页根容器 | `role='main'` |
| 登录模式切换 | `role='tablist'` |

### 10.2 图片 Alt 文本

所有图片组件均提供有意义的 `alt` 属性：
- HotelCard：酒店名称
- RoomTypeCard：房型名称或「房型图片」
- Hero Swiper：幻灯片标签或「酒店图片」
- 地图卡片：酒店名称

### 10.3 安全区域适配

- `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)` 用于 Toast 容器、底部导航、预订底栏
- `100dvh`（dynamic viewport height）用于全屏布局（地图页、详情页）

---

## 11. 性能优化技术

| 技术 | 应用场景 | 效果 |
|------|---------|------|
| `requestIdleCallback` | 首页延迟加载热门推荐 + 快捷标签 | 不阻塞首屏渲染 |
| `will-change` | 页面转场动画 | GPU 加速渲染 |
| `React.memo` | RoomTypeCard、OrderCard | 避免不必要重渲染 |
| 防抖 400ms | 地图 POI 搜索 | 减少 API 调用频次 |
| ref 防并发 | 多处 `loadingRef.current` | 防重复加载请求 |
| 图片代理 webp | `resolveImageUrl` | 按需压缩 + 格式转换 |
| 静默刷新 | 详情页 / 收藏页 | 保留旧数据，后台更新不闪 |
| scroll-snap | 地图底部卡片列表 | 滑动吸附，精确定位 |
| 双阶段加载 | 列表页搜索 + 推荐 | 无缝接续，填充内容空白 |

