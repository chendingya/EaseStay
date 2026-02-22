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
