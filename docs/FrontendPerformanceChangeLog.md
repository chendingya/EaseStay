# 前端性能优化组件台账

用于记录每次性能优化中“改了哪些组件、用了什么方法、如何验证”，便于后续复用与回归审查。

## 记录模板
| 日期 | 页面/模块 | 组件/文件 | 优化方法 | 目标指标 | 验证 |
|---|---|---|---|---|---|
| 2026-02-22 | 示例页 | `admin/src/pages/Example.jsx` | 懒加载低频弹窗；按需请求 tab 数据 | 降低 LCP、Unused JS | `npm run build` 通过；`npm test` 通过；Lighthouse 复测 |

## 变更记录
| 日期 | 页面/模块 | 组件/文件 | 优化方法 | 目标指标 | 验证 |
|---|---|---|---|---|---|
| 2026-02-22 | Dashboard | `admin/src/pages/Dashboard.jsx` | 批量操作弹窗整体迁移为懒加载；父组件状态收口为 `batchModalType` | 降低首屏 JS 解析与主线程占用，减少 Unused JS | `npm run build` 通过并产生 `DashboardBatchModals-*.js`；`npm test` 通过 |
| 2026-02-22 | Dashboard | `admin/src/components/DashboardBatchModals.jsx` | 下沉 `Modal/Form/Table/DatePicker` 等重依赖与低频逻辑，按交互触发加载 | 降低 Dashboard 首屏包体与 Script Evaluation | `npm run build` 通过；`npm test` 通过 |
| 2026-02-22 | HotelDetail | `admin/src/pages/HotelDetail.jsx` | `RoomsTab/OrdersTab/DiscountModal` 懒加载；`orders` 改为仅在订单 tab 激活后请求；优惠甘特图空闲时渲染 | 降低该页 LCP、主线程工作时间与 Unused JS | `npm run build` 通过并产生 `RoomsTab-*.js`、`OrdersTab-*.js`、`DiscountModal-*.js`；`npm test` 通过 |
| 2026-02-22 | HotelDetail | `admin/src/components/hotel-detail/RoomsTab.jsx` | 将房型表格与图片预览从主页面拆出为低频子模块 | 降低详情页首屏解析执行负担 | `npm run build` 通过；`npm test` 通过 |
| 2026-02-22 | HotelDetail | `admin/src/components/hotel-detail/OrdersTab.jsx` | 订单表格逻辑独立，配合 tab 激活按需挂载 | 降低首屏渲染与非必要请求 | `npm run build` 通过；`npm test` 通过 |
| 2026-02-22 | HotelDetail | `admin/src/components/hotel-detail/DiscountModal.jsx` | 折扣弹窗与 `DatePicker/Form` 逻辑拆分并按需加载 | 降低首屏 JS 体积与编译执行耗时 | `npm run build` 通过；`npm test` 通过 |
| 2026-02-22 | i18n 路由渲染 | `admin/src/App.jsx` | 增加路由命名空间就绪门控（未加载完成前不渲染对应路由组件），避免渲染原始 key | 修复文案错误显示，保证多语言内容正确性 | `npm run build` 通过；`npm test` 通过 |
| 2026-02-22 | i18n 命名空间状态 | `admin/src/locales/index.js` | 增加 `hasLoadedNamespaces` 供路由门控快速判断是否已加载 | 减少路由切换时 key 泄漏与闪烁 | `npm run build` 通过；`npm test` 通过 |
| 2026-02-22 | HotelDetail 数据请求 | `admin/src/pages/HotelDetail.jsx` | 去掉 `?_t=${Date.now()}` 防缓存参数；`/overview` 改为空闲时请求，移出首屏关键路径 | 降低详情页关键请求链压力与首屏等待 | `npm run build` 通过；`npm test` 通过 |
| 2026-02-22 | HotelDetail 图片体验回归修复 | `admin/src/pages/HotelDetail.jsx` | 恢复顶部 `Carousel` 与 `Image.PreviewGroup`，恢复图片放大与预览内切换；非首图继续 `loading="lazy"` 以控制首屏开销 | 修复“无轮播/不可放大”的功能回归，并尽量不牺牲首屏性能 | `npm run build` 通过；`npm test` 通过 |
| 2026-02-22 | HotelDetail 图片区精简 | `admin/src/pages/HotelDetail.jsx` | 删除底部重复酒店图片卡片，仅保留顶部轮播作为唯一图片入口 | 减少重复 DOM 与重复图片解码开销，进一步压缩详情页渲染负担 | `npm run build` 通过 |
| 2026-02-22 | Messages | `admin/src/pages/Messages.jsx` | 非缓存优化：全部/未读切换改为前端过滤（不重复请求）；列表增加分页（每页 12 条）与条目 `content-visibility`；仅初次加载显示全页 `Spin`，批量已读仅按钮 loading | 降低页面切换时的网络与主线程渲染开销，减少长列表导致的渲染压力 | `npm run build` 通过；`npm test` 通过 |
| 2026-02-22 | AdminHotelDetail | `admin/src/pages/AdminHotelDetail.jsx` | 对齐商户详情页策略：`RoomsTab/OrdersTab` 懒加载、订单仅在订单 tab 激活后请求、`overview` 与优惠甘特图空闲时请求/渲染、顶部图片改为 `Carousel + PreviewGroup` 并去除重复图片区 | 降低管理员酒店详情首屏 JS 解析执行与非关键请求占用，减少 Unused JS 与主线程阻塞 | `npm run build` 通过并产生 `admin-hotel-detail/RoomsTab-*.js`、`admin-hotel-detail/OrdersTab-*.js`；`npm test` 通过 |
| 2026-02-22 | AdminHotelDetail | `admin/src/components/admin-hotel-detail/RoomsTab.jsx` | 将管理员房型表格与图片预览逻辑下沉到低频子模块，仅在房型 tab 激活时挂载 | 降低详情页初始渲染压力与表格相关依赖首屏开销 | `npm run build` 通过；`npm test` 通过 |
| 2026-02-22 | AdminHotelDetail | `admin/src/components/admin-hotel-detail/OrdersTab.jsx` | 将管理员订单表格与统计跳转逻辑下沉，配合订单 tab 按需请求按需渲染 | 降低详情页首屏请求数与非必要表格渲染 | `npm run build` 通过；`npm test` 通过 |
| 2026-02-22 | AuditDetail | `admin/src/pages/AuditDetail.jsx` | 待审请求改为空闲时请求；房型大表和优惠甘特图延迟挂载；图片补充 `loading/decoding` 惰性策略 | 降低审核详情首屏主线程占用和非关键接口阻塞，改善长页渲染稳定性 | `npm run build` 通过；`npm test` 通过 |
| 2026-02-22 | OrderStats | `admin/src/pages/OrderStats.jsx` | `echarts-for-react` 懒加载，图表在数据到位后空闲时再挂载 | 降低统计页首屏 Script Evaluation 与图表初始化阻塞 | `npm run build` 通过；`npm test` 通过 |
| 2026-02-22 | HotelDetail/AdminHotelDetail 复用收口 | `admin/src/components/hotel-shared/OrdersTabBase.jsx` | 将商户/管理员 `OrdersTab` 共用列定义与渲染逻辑，页面侧仅保留 i18n 前缀与空态配置 | 减少重复代码与双端维护偏差，稳定后续性能优化复用效率 | `npm run build` 通过；`npm test` 通过 |
| 2026-02-22 | HotelDetail/AdminHotelDetail 复用收口 | `admin/src/components/hotel-shared/RoomsTabBase.jsx` | 将商户/管理员 `RoomsTab` 共用为统一基座，差异通过状态列/操作列开关与 i18n key 注入 | 减少房型表格双端重复实现，保持行为一致并降低后续维护回归风险 | `npm run build` 通过；`npm test` 通过 |
| 2026-02-22 | Dashboard（管理员/商户） | `admin/src/pages/Dashboard.jsx` | 首屏改为轻量统计请求；批量弹窗所需酒店列表改为点击后按需分页拉取；商户 overview 改为空闲时请求 | 降低 Dashboard 首屏请求体积与主线程压力，减少低频数据对关键路径阻塞 | `npm run build` 通过；`npm test` 通过 |
| 2026-02-22 | Dashboard 批量弹窗 | `admin/src/components/DashboardBatchModals.jsx` | 增加酒店列表 loading 态并在加载中禁用批量提交，避免低频数据加载阶段误触发提交 | 降低批量操作异常与无效渲染触发概率，提升交互稳定性 | `npm run build` 通过；`npm test` 通过 |
| 2026-02-22 | RequestAudit | `admin/src/pages/RequestAudit.jsx` | 审核提交由全页 loading 改为行级 loading；列表刷新改为无阻塞刷新；`typeMap/statusMap/columns/tabItems` 收口到 memo | 降低审核动作引发的整页重渲染与交互阻塞，减少无意义重复计算 | `npm run build` 通过；`npm test` 通过 |
| 2026-02-22 | Audit | `admin/src/pages/Audit.jsx` | `statusMap` 与表格 `columns` 使用 memo 收口，减少筛选/分页过程中的重复列对象重建 | 降低列表页渲染抖动与不必要重渲染开销 | `npm run build` 通过；`npm test` 通过 |
| 2026-02-22 | Audit 首屏关键路径 | `admin/src/pages/Audit.jsx`、`admin/src/components/audit/AuditTable.jsx` | 审核列表 `Table` 下沉到懒加载子组件；父页仅保留筛选与数据态，表格在空闲时挂载并使用稳定占位回退 | 降低审核页首屏 JS 解析执行压力，改善 FCP/LCP（重依赖组件延后加载） | `npm run build` 通过；`npm test` 通过 |
| 2026-02-24 | Audit 启动请求链路 | `admin/src/services/request.js`、`admin/src/services/notificationService.js` | 移除全局 300ms 请求防抖等待，改为“仅并发同键请求去重”；未读数接口去掉时间戳防缓存参数；消息组件改为动态按需加载 | 降低首屏关键请求等待与 Render-blocking 请求时延，减少首屏 Unused JS/CSS 注入 | `npm run build` 通过；`npm test` 通过 |
| 2026-02-24 | i18n 首屏命名空间加载 | `admin/src/locales/index.js`、`admin/src/main.jsx` | 基础命名空间改为静态内联资源，不再走动态 import；应用启动时预加载当前路由命名空间 | 降低 i18n 初始化网络依赖树深度，缩短首屏可渲染等待 | `npm run build` 通过；`npm test` 通过 |
| 2026-02-24 | App 非关键请求后置 | `admin/src/App.jsx` | 未读通知数、管理员待办统计改为空闲时初始化（`requestIdleCallback`/定时回退），避免与审核页首屏数据并行争抢关键带宽 | 优化 `/audit` 首屏关键路径优先级，改善 FCP/LCP 稳定性 | `npm run build` 通过；`npm test` 通过 |
