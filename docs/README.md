# 文档索引

- 需求文档（PRD）：[PRD.md](./PRD.md)
- 技术架构文档（Architecture）：[Architecture.md](./Architecture.md)
- 详细设计文档（SDD）：[SDD.md](./SDD.md)
- 设计原则（Design Principles）：[DesignPrinciples.md](./DesignPrinciples.md)
- 国际化实践手册（i18n Practices）：[I18nPractices.md](./I18nPractices.md)
- 移动端动效指南（Motion Guide）：[MotionGuide.md](./MotionGuide.md)
- 前端性能优化复用手册（Frontend Performance Playbook）：[FrontendPerformancePlaybook.md](./FrontendPerformancePlaybook.md)
- 前端性能优化组件台账（Frontend Performance Change Log）：[FrontendPerformanceChangeLog.md](./FrontendPerformanceChangeLog.md)

## 最近更新（2026-02）
- 前端性能台账上线：新增《前端性能优化组件台账》，按“组件/方法/指标/验证”记录每次优化
- Admin 前端性能规则沉淀：新增《前端性能优化复用手册》，固化跨页面可复用的拆分、请求、渲染与验收规则
- Admin 国际化工程化升级：词典 namespace 拆分、路由级按需加载、语言切换懒加载
- i18n 门禁上线：`i18n:check`（key 一致性）与 `i18n:check:strict`（含硬编码扫描）
- 国际化一致性修复：占位符命名与调用参数对齐（`count/value`），标题 key 与模板 key 分离
- Admin 展示一致性修复：审核页/详情页房型价格显示修复，房型优惠补充有效期展示
- 优惠时间视图统一：审核页新增与详情页一致的优惠甘特图
- 房型图片链路补齐：管理员/商户/审核详情页房型表新增图片预览（兼容 `images/image_urls/room_images`）
- 表格多语言韧性：`Actions` 列引入自动宽度估算与 `max-content` 滚动兜底
- 文档体系补齐：新增国际化实践手册，更新架构、详细设计与设计原则中的 i18n 基线
- 移动端订单页：顶部栏统一、状态分段、筛选弹层、下拉刷新/上拉加载、订单卡片字段补全、订单详情与待使用取消/使用
- 移动端支付页：订单支付链路（模拟支付）与订单状态流转说明
- 移动端列表与卡片：订单/收藏/酒店列表交互与动效统一，卡片风格一致化
- 移动端房型链路重构：酒店详情页房型列表改为复用 `OrderList + RoomTypeCard`，新增房型详情页 `room-detail` 并支持房型直达预订
- 移动端页面统一：顶部栏组件标准化、详情页透明渐变、页面背景色统一
- 移动端交互增强：订单列表下拉刷新临界反馈、H5 顶部下拉刷新、列表分步入场、无限滚动加载提示
- 移动端按钮状态：按钮加载态过渡、详情页预订加载与防重复点击
- 移动端转场效果：页面切换模糊缩放动画
- 订单数据修复：订单列表酒店名称回填与缓存
- 移动端玻璃按钮：预订房型、退出登录、取消订单、确认使用、取消收藏统一样式
- 移动端详情页 Hero 图片区：顶部大图区支持下拉展开至 3/4 屏；酒店图片与房型图片合并幻灯片（全局 URL 去重）；切换房型图片时显示房型名称与价格标签；背景为同源图片毛玻璃模糊层，随切换淡变；全量预加载无等待，拖动逻辑用 `useRef` 消除抖动
