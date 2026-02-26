# Admin 管理端 - 组件架构图文档

> 本文档描述 PC 管理端（admin）的组件层次结构、依赖关系和复用模式。

## 1. 组件层次总览

```mermaid
graph TB
    subgraph Root["应用根"]
        App["App.jsx<br/>路由 / 认证 / 布局 / i18n"]
    end

    subgraph Layout["布局壳"]
        AppLayout["AppLayout<br/>Sider + Header + Content"]
        AppBreadcrumb["AppBreadcrumb<br/>面包屑导航"]
        LanguageSwitcher["LanguageSwitcher<br/>中英切换"]
    end

    subgraph Guards["路由守卫"]
        RequireAuth["RequireAuth<br/>认证检查"]
        RequireRole["RequireRole<br/>角色检查"]
        LazyRoute["LazyRoute<br/>Suspense + i18n 就绪"]
    end

    subgraph Pages["页面组件（React.lazy）"]
        Login
        Dashboard
        Hotels
        HotelEdit
        HotelDetail
        AdminHotels
        AdminHotelDetail
        Audit
        AuditDetail
        RequestAudit
        OrderStats
        Messages
        Merchants
        MerchantDetail
        Account
    end

    subgraph SharedComponents["公共组件"]
        GlassCard["GlassCard<br/>毛玻璃卡片"]
        GlassButton["GlassButton<br/>毛玻璃按钮"]
        GanttTimeline["GanttTimeline<br/>甘特图时间线"]
        glassMessage["glassMessage<br/>全局消息提示"]
        TableFilterBar["TableFilterBar<br/>表格筛选条"]
        GlassUI["GlassUI<br/>样式集合"]
    end

    subgraph Hooks["自定义 Hooks"]
        useRemoteTableQuery["useRemoteTableQuery<br/>搜索防抖 + 分页管理"]
    end

    App --> Layout
    App --> Guards
    Guards --> Pages
    Pages --> SharedComponents
    Pages --> Hooks
```

## 2. 页面与组件依赖关系

```mermaid
graph LR
    subgraph 商户页面组
        Hotels --> TableFilterBar
        Hotels --> useRemoteTableQuery
        HotelEdit --> MapPicker["hotel-shared/MapPicker"]
        HotelEdit --> ImageUploader["hotel-shared/ImageUploader"]
        HotelEdit --> FacilitySelector["hotel-shared/FacilitySelector"]
        HotelEdit --> RoomTypeManager["hotel-shared/RoomTypeManager"]
        HotelEdit --> PromotionManager["hotel-shared/PromotionManager"]
        HotelEdit --> NearbyInfoEditor["hotel-shared/NearbyInfoEditor"]
        HotelEdit --> HotelPreview["hotel-shared/HotelPreview"]
        HotelDetail --> RoomsTab["hotel-detail/RoomsTab"]
        HotelDetail --> OrdersTab["hotel-detail/OrdersTab"]
        HotelDetail --> DiscountModal["hotel-detail/DiscountModal"]
        HotelDetail --> GanttTimeline
    end

    subgraph 管理员页面组
        AdminHotels --> TableFilterBar
        AdminHotels --> useRemoteTableQuery
        AdminHotelDetail --> RoomsTab_A["admin-hotel-detail/RoomsTab"]
        AdminHotelDetail --> OrdersTab_A["admin-hotel-detail/OrdersTab"]
        AdminHotelDetail --> GanttTimeline
        Audit --> TableFilterBar
        Audit --> useRemoteTableQuery
        AuditDetail --> GanttTimeline
        RequestAudit --> GanttTimeline
    end

    subgraph 通用页面组
        Dashboard --> DashboardBatchModals
        Dashboard --> GlassButton
        Messages --> GlassCard
        Merchants --> useRemoteTableQuery
        MerchantDetail --> GlassCard
        OrderStats --> ReactECharts["ReactECharts（懒加载）"]
    end
```

## 3. 共享组件详细架构

### 3.1 hotel-shared 组件族

```mermaid
graph TB
    HotelEdit["HotelEdit.jsx"] --> Components

    subgraph Components["hotel-shared/"]
        MapPicker["MapPicker<br/>地图选址组件<br/>高德地图 POI 搜索<br/>经纬度回填"]
        ImageUploader["ImageUploader<br/>图片上传组件<br/>多图/预览/删除<br/>URL 添加"]
        FacilitySelector["FacilitySelector<br/>设施选择组件<br/>预设标签多选<br/>自定义申请入口"]
        RoomTypeManager["RoomTypeManager<br/>房型管理组件<br/>增删改房型<br/>预设模板快速添加"]
        PromotionManager["PromotionManager<br/>优惠管理组件<br/>类型选择/参数设置<br/>有效期配置"]
        NearbyInfoEditor["NearbyInfoEditor<br/>周边信息编辑<br/>景点/交通/商场<br/>地图搜索联动"]
        HotelPreview["HotelPreview<br/>酒店预览组件<br/>实时价格计算<br/>GlassCard 展示"]
    end

    MapPicker -->|"GET /api/map/search"| MapAPI["地图 API"]
    NearbyInfoEditor -->|"GET /api/map/search"| MapAPI
    FacilitySelector -->|"POST /api/requests"| ReqAPI["申请 API"]
    RoomTypeManager -->|"POST /api/requests"| ReqAPI
    PromotionManager -->|"POST /api/requests"| ReqAPI
```

### 3.2 hotel-detail 组件族（商户侧）

```mermaid
graph TB
    HotelDetail["HotelDetail.jsx"]

    subgraph DetailComponents["hotel-detail/"]
        RoomsTab["RoomsTab<br/>房型列表<br/>图片预览/折扣显示/参数展示"]
        OrdersTab["OrdersTab<br/>订单分页列表<br/>订单号/金额/状态"]
        DiscountModal["DiscountModal<br/>折扣设置弹窗<br/>设置/取消折扣操作"]
    end

    HotelDetail --> RoomsTab
    HotelDetail --> OrdersTab
    HotelDetail --> DiscountModal
    HotelDetail --> GanttTimeline["GanttTimeline<br/>优惠时间甘特图"]

    DiscountModal -->|"POST /api/merchant/hotels/batch-discount"| API
```

### 3.3 admin-hotel-detail 组件族（管理员侧）

```mermaid
graph TB
    AdminHotelDetail["AdminHotelDetail.jsx"]

    subgraph AdminDetailComponents["admin-hotel-detail/"]
        AdminRoomsTab["RoomsTab<br/>房型列表（只读）<br/>图片预览/折扣信息"]
        AdminOrdersTab["OrdersTab<br/>订单分页列表"]
    end

    AdminHotelDetail --> AdminRoomsTab
    AdminHotelDetail --> AdminOrdersTab
    AdminHotelDetail --> GanttTimeline["GanttTimeline<br/>优惠时间甘特图"]
```

### 3.4 merchants 组件族

```mermaid
graph TB
    Merchants["Merchants.jsx"]
    MerchantDetail["MerchantDetail.jsx"]

    subgraph MerchantComponents["merchants/"]
        MerchantsTable["MerchantsTable<br/>商户列表表格（懒加载）"]
        ResetPasswordModal["ResetPasswordModal<br/>重置密码弹窗（懒加载）"]
    end

    Merchants --> MerchantsTable
    Merchants --> ResetPasswordModal
    MerchantDetail --> ResetPasswordModal
```

## 4. 公共 UI 组件规范

```mermaid
graph TB
    subgraph GlassUI["Glass 设计系统"]
        GlassCard["GlassCard<br/>半透明 + 模糊效果卡片<br/>用于预览和统计展示"]
        GlassButton["GlassButton<br/>毛玻璃风格按钮<br/>用于主要操作入口"]
        GlassMessage["glassMessage<br/>全局消息提示<br/>success / error / warning / info"]
        GlassCSS["GlassUI.css<br/>共享样式变量"]
    end

    subgraph AntDesign["Ant Design 组件"]
        Table["Table<br/>数据表格"]
        Form["Form<br/>表单"]
        Modal["Modal<br/>弹窗"]
        Card["Card<br/>卡片容器"]
        Tabs["Tabs<br/>标签页"]
        Descriptions["Descriptions<br/>描述列表"]
        Statistic["Statistic<br/>统计数值"]
        Carousel["Carousel<br/>图片轮播"]
    end

    subgraph ThirdParty["第三方组件"]
        ReactECharts["ReactECharts<br/>图表可视化（懒加载）"]
        ImagePreview["Image.PreviewGroup<br/>图片预览"]
    end

    GlassCSS --> GlassCard
    GlassCSS --> GlassButton
    GlassCSS --> GlassMessage
```

## 5. 状态与服务层架构

```mermaid
graph TB
    subgraph StateLayer["stores/（Zustand）"]
        SessionStore["sessionStore<br/>token/role/username<br/>persist + legacy localStorage sync"]
        NotificationStore["notificationStore<br/>unreadCount + refresh/mark/delete"]
        PendingStore["adminPendingStore<br/>pendingHotels/pendingRequests"]
    end

    subgraph Barrel["services/index.js（统一出口）"]
        direction LR
        export_request["export { request, api }"]
        export_notif["export { getNotifications, ... }"]
    end

    subgraph RequestModule["services/request.js"]
        AxiosInstance["axios 实例<br/>baseURL / timeout / 拦截器"]
        AuthRead["鉴权读取<br/>优先 sessionStore，回退 localStorage"]
        ApiObject["api 对象<br/>get / post / put / patch / delete<br/>请求去重 / 自动 unwrap"]
    end

    subgraph NotifModule["services/notificationService.js"]
        GetNotifs["getNotifications()"]
        GetUnread["getUnreadCount()"]
        MarkRead["markAsRead(id?)"]
        DeleteNotif["deleteNotification(id)"]
        OnChange["onUnreadCountChange(cb)<br/>兼容层保留"]
        TypeConfig["NotificationTypeConfig"]
        FormatTime["formatNotificationTime()"]
    end

    SessionStore --> AuthRead
    NotificationStore -->|"调用"| NotifModule
    PendingStore -->|"调用"| ApiObject

    Barrel --> RequestModule
    Barrel --> NotifModule

    subgraph Consumers["消费方"]
        AppJSX["App.jsx<br/>读取三类全局状态"]
        MessagesPage["Messages.jsx<br/>消息列表 + 操作"]
        AuditPages["AuditDetail/RequestAudit<br/>触发待审数刷新"]
        RolePages["Dashboard/Hotels<br/>读取 role"]
    end

    AppJSX --> StateLayer
    MessagesPage --> NotificationStore
    AuditPages --> PendingStore
    RolePages --> SessionStore
    AppJSX -->|"api 调用"| Barrel
    MessagesPage -->|"通知列表查询"| Barrel
```

## 6. Hooks 架构

```mermaid
graph TB
    subgraph Hook["useRemoteTableQuery"]
        Input["配置项<br/>initialPage / initialPageSize<br/>initialSearch / debounceMs"]
        State["内部状态<br/>searchInput / keyword<br/>page / pageSize / total"]
        Output["返回值<br/>searchInput / setSearchInput<br/>keyword / page / pageSize<br/>setPage / setPageSize / setTotal<br/>handlePageChange / resetKeyword"]
    end

    subgraph Debounce["防抖机制"]
        SearchInput["searchInput 变化"]
        Timer["setTimeout 350ms"]
        SetKeyword["setKeyword + setPage(1)"]
    end

    subgraph Consumers["使用方"]
        Hotels["Hotels.jsx"]
        AdminHotels["AdminHotels.jsx"]
        Audit["Audit.jsx"]
        Merchants["Merchants.jsx"]
    end

    Input --> State
    State --> Output
    SearchInput --> Timer --> SetKeyword

    Consumers -->|"消费 keyword/page/pageSize"| Hook
    Consumers -->|"绑定 searchInput → TableFilterBar"| TableFilterBar
    Consumers -->|"api.get(url, {params}) → setTotal"| API["api 对象"]
```

## 7. 懒加载策略

```mermaid
graph TB
    subgraph PageLevel["页面级懒加载"]
        direction LR
        L1["React.lazy(() => import('./pages/Login'))"]
        L2["React.lazy(() => import('./pages/Dashboard'))"]
        L3["React.lazy(() => import('./pages/Hotels'))"]
        L4["...共15个页面"]
    end

    subgraph ComponentLevel["组件级懒加载"]
        direction LR
        C1["hotel-detail/RoomsTab"]
        C2["hotel-detail/OrdersTab"]
        C3["hotel-detail/DiscountModal"]
        C4["DashboardBatchModals"]
        C5["merchants/MerchantsTable"]
        C6["ReactECharts"]
    end

    subgraph ServiceLevel["服务级懒加载"]
        direction LR
        S1["glassMessage<br/>动态 import()"]
        S2["notificationService<br/>scheduleIdleTask"]
    end

    subgraph IdleCallback["空闲回调"]
        direction LR
        I1["requestIdleCallback<br/>延迟渲染表格"]
        I2["requestIdleCallback<br/>延迟加载 overview"]
    end

    PageLevel --> Suspense["React.Suspense<br/>Loading 骨架"]
    ComponentLevel --> Suspense
    ServiceLevel --> FirstInteraction["首次交互时加载"]
    IdleCallback --> BetterTTI["提升 TTI 指标"]
```

## 8. 完整文件结构图

```
admin/src/
├── main.jsx                    # 入口：i18n 初始化 → ReactDOM.render
├── App.jsx                     # 根组件：路由/布局/i18n + Zustand 全局状态消费
├── App.css                     # 全局样式
├── index.css                   # CSS Reset
│
├── routes/
│   └── routeConfig.js          # 路由元数据 + namespace 映射
│
├── services/
│   ├── index.js                # 服务统一出口（barrel）
│   ├── request.js              # axios 封装 + 请求去重 api 对象（store token 优先）
│   └── notificationService.js  # 通知 CRUD + 兼容监听
│
├── stores/
│   ├── index.js                # store 统一出口
│   ├── sessionStore.js         # 认证态持久化 + 旧键兼容
│   ├── notificationStore.js    # 未读数/已读/删除动作
│   └── adminPendingStore.js    # 管理员待审统计
│
├── hooks/
│   └── useRemoteTableQuery.js  # 远程表格搜索防抖 + 分页
│
├── components/
│   ├── index.js                # 组件统一出口
│   ├── GlassCard.jsx           # 毛玻璃卡片
│   ├── GlassButton.jsx         # 毛玻璃按钮
│   ├── GlassUI.jsx             # UI 基础组件
│   ├── GlassUI.css             # Glass 样式
│   ├── glassMessage.js         # 全局消息提示
│   ├── GlassMessageView.jsx    # 消息渲染视图
│   ├── GanttTimeline.jsx       # 甘特图时间线
│   ├── TableFilterBar.jsx      # 表格筛选条
│   ├── DashboardBatchModals.jsx# 批量操作弹窗
│   ├── hotel-shared/           # 酒店编辑共享组件
│   ├── hotel-detail/           # 商户酒店详情子组件
│   ├── admin-hotel-detail/     # 管理员酒店详情子组件
│   ├── audit/                  # 审核相关子组件
│   └── merchants/              # 商户管理子组件
│
├── pages/
│   ├── Login.jsx               # 登录/注册
│   ├── Dashboard.jsx           # 工作台
│   ├── Hotels.jsx              # 商户酒店列表
│   ├── HotelEdit.jsx           # 酒店编辑/新建
│   ├── HotelDetail.jsx         # 商户酒店详情
│   ├── AdminHotels.jsx         # 管理员酒店列表
│   ├── AdminHotelDetail.jsx    # 管理员酒店详情
│   ├── Audit.jsx               # 审核列表
│   ├── AuditDetail.jsx         # 审核详情
│   ├── RequestAudit.jsx        # 申请审核
│   ├── OrderStats.jsx          # 订单统计
│   ├── Messages.jsx            # 消息中心
│   ├── Merchants.jsx           # 商户管理列表
│   ├── MerchantDetail.jsx      # 商户详情
│   └── Account.jsx             # 账户设置
│
├── locales/                    # i18n 资源
│   ├── zh-CN/                  # 中文
│   │   ├── common.json
│   │   ├── auth.json
│   │   ├── dashboard.json
│   │   └── ...
│   └── en-US/                  # 英文
│       ├── common.json
│       ├── auth.json
│       ├── dashboard.json
│       └── ...
│
├── utils/                      # 工具函数
└── assets/                     # 静态资源
```
