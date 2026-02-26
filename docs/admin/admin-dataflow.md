# Admin 管理端 - 数据流图文档

> 本文档描述 PC 管理端（admin）各模块的数据流向，涵盖前端组件、服务层、API 层到后端数据库的完整链路。

## 1. 全局数据流概览

```mermaid
graph TB
    subgraph Browser["浏览器"]
        UI["页面组件<br/>Dashboard / Hotels / Audit ..."]
        Hook["useRemoteTableQuery<br/>搜索防抖 + 分页态"]
        ServiceAPI["services/request.js → api 对象<br/>请求去重 + 拦截器"]
        NotifySvc["notificationService<br/>通知发布-订阅"]
        I18N["i18n Loader<br/>语言 + namespace 懒加载"]
        LocalStorage["localStorage<br/>token / role / username / cache"]
    end

    subgraph Server["Express 后端"]
        APIGateway["路由聚合层<br/>/api/*"]
        AuthMW["JWT 鉴权中间件"]
        Controllers["Controllers<br/>auth / hotel / request / preset / map / notification"]
        Services["Services<br/>hotelService / requestService / notificationService"]
    end

    subgraph Data["数据层"]
        DB[(Supabase PostgreSQL)]
        MapAPI["高德地图 API"]
    end

    UI -->|"用户操作触发"| Hook
    Hook -->|"keyword / page / pageSize"| UI
    UI -->|"api.get / api.post ..."| ServiceAPI
    ServiceAPI -->|"axios + Bearer Token"| APIGateway
    APIGateway --> AuthMW
    AuthMW --> Controllers
    Controllers --> Services
    Services --> DB
    Controllers -->|"POI/地理编码"| MapAPI
    ServiceAPI -->|"响应数据"| UI
    UI -->|"markAsRead / getUnreadCount"| NotifySvc
    NotifySvc -->|"onUnreadCountChange"| UI
    UI -->|"路由切换"| I18N
    I18N -->|"namespace 就绪"| UI
    UI <-->|"token / cache 读写"| LocalStorage
```

## 2. 认证数据流

```mermaid
sequenceDiagram
    participant U as 用户
    participant Login as Login.jsx
    participant API as api 对象
    participant Server as POST /api/auth/*
    participant DB as PostgreSQL
    participant LS as localStorage
    participant App as App.jsx

    Note over U,App: 登录流程
    U->>Login: 输入用户名 + 密码
    Login->>API: api.post('/api/auth/login', {username, password})
    API->>Server: POST /api/auth/login
    Server->>DB: 查询 users 表验证身份
    DB-->>Server: 用户记录
    Server-->>API: {token, userRole}
    API-->>Login: 业务数据
    Login->>LS: 写入 token / userRole / username
    Login->>App: onLoggedIn({token, role, username})
    App->>App: setAuth → 渲染侧边栏

    Note over U,App: 注册流程
    U->>Login: 输入用户名 + 密码 + 角色 + 验证码
    Login->>API: api.post('/api/auth/sms/send', {username})
    API->>Server: POST /api/auth/sms/send
    Server-->>API: {code, expiresAt}
    API-->>Login: 自动回填验证码（演示模式）
    U->>Login: 提交注册
    Login->>API: api.post('/api/auth/register', {username, password, role, code})
    API->>Server: POST /api/auth/register
    Server->>DB: 插入 users 表
    Server-->>API: {id, username, role}
    Login->>API: 自动调用登录接口
```

## 3. 商户侧数据流

### 3.1 酒店列表（Hotels.jsx）

```mermaid
graph LR
    subgraph 用户交互
        Search["搜索输入"]
        Filter["状态/城市筛选"]
        Page["翻页操作"]
        Import["CSV 导入"]
        Export["CSV 导出"]
    end

    subgraph Hook层
        URTQ["useRemoteTableQuery<br/>searchInput → 350ms防抖 → keyword"]
    end

    subgraph API请求
        FetchHotels["GET /api/merchant/hotels<br/>?page&pageSize&status&city&keyword"]
        FetchCities["GET /api/merchant/hotels/cities"]
        CreateHotel["POST /api/merchant/hotels"]
        OfflineHotel["PATCH /api/merchant/hotels/:id/status"]
        DeleteReq["POST /api/requests<br/>type=hotel_delete"]
    end

    subgraph 页面状态
        Hotels["hotels[]"]
        Loading["loading"]
        CityOpts["cityOptions[]"]
        Total["total"]
    end

    Search --> URTQ
    Filter --> FetchHotels
    Page --> URTQ
    URTQ -->|keyword/page/pageSize| FetchHotels
    FetchHotels --> Hotels
    FetchHotels --> Total
    FetchCities --> CityOpts
    Import -->|parseCSV → 逐条| CreateHotel
    Export -->|全量拉取 → CSV Blob| FetchHotels
    OfflineHotel -->|刷新列表| FetchHotels
    DeleteReq -->|刷新列表| FetchHotels
```

### 3.2 酒店编辑（HotelEdit.jsx）

```mermaid
graph TB
    subgraph 数据加载
        LoadPresets["GET /api/presets<br/>设施/房型/优惠/城市预设"]
        LoadApproved["GET /api/requests?status=approved<br/>已审批的自定义项"]
        LoadHotel["GET /api/merchant/hotels/:id<br/>编辑模式加载已有数据"]
    end

    subgraph 表单状态["Ant Design Form"]
        BasicInfo["基本信息<br/>名称/地址/城市/星级/开业时间"]
        Facilities["设施选择<br/>预设 + 自定义"]
        RoomTypes["房型管理<br/>预设模板 + 自定义"]
        Promotions["优惠信息<br/>预设类型 + 自定义"]
        Images["图片管理<br/>上传/URL/预览"]
        MapData["地图数据<br/>经纬度/周边信息"]
    end

    subgraph 提交
        Create["POST /api/merchant/hotels<br/>新建"]
        Update["PUT /api/merchant/hotels/:id<br/>更新"]
        ApplyReq["POST /api/requests<br/>申请自定义设施/房型/优惠"]
        MapSearch["GET /api/map/search<br/>地图选址/周边搜索"]
    end

    LoadPresets --> Facilities
    LoadPresets --> RoomTypes
    LoadPresets --> Promotions
    LoadApproved --> Facilities
    LoadApproved --> RoomTypes
    LoadApproved --> Promotions
    LoadHotel --> BasicInfo
    LoadHotel --> Facilities
    LoadHotel --> RoomTypes

    BasicInfo --> Create
    BasicInfo --> Update
    Facilities --> Create
    RoomTypes --> Create
    Promotions --> Create
    Images --> Create
    MapData --> Create
    MapSearch --> MapData
    ApplyReq -->|审批后可用| Facilities
```

### 3.3 酒店详情（HotelDetail.jsx）

```mermaid
sequenceDiagram
    participant Page as HotelDetail
    participant API as api 对象
    participant Server as Express API

    Page->>API: api.get('/api/merchant/hotels/:id')
    API->>Server: GET /api/merchant/hotels/:id
    Server-->>Page: hotel 数据（含 roomTypes）

    Note over Page: requestIdleCallback 延迟加载
    Page->>API: api.get('/api/merchant/hotels/:id/overview')
    Server-->>Page: {totalRooms, usedRooms, freeRooms, offlineRooms}

    Note over Page: 用户切换到订单 Tab
    Page->>API: api.get('/api/merchant/hotels/:id/orders?page=1&pageSize=8')
    Server-->>Page: {page, pageSize, total, list}

    Note over Page: 用户设置房型折扣
    Page->>API: api.post('/api/merchant/hotels/batch-discount', {roomTypeId, discount, quantity})
    Server-->>Page: 批量更新结果
    Page->>API: 刷新酒店数据
```

## 4. 管理员侧数据流

### 4.1 审核流数据流

```mermaid
sequenceDiagram
    participant Admin as 管理员
    participant AuditList as Audit.jsx
    participant AuditDetail as AuditDetail.jsx
    participant API as api 对象
    participant Server as Express API
    participant DB as PostgreSQL
    participant NotifySvc as 通知服务

    Admin->>AuditList: 进入审核列表
    AuditList->>API: api.get('/api/admin/hotels?status=pending&page=1&pageSize=10')
    API->>Server: GET /api/admin/hotels
    Server->>DB: 查询 hotels 表
    DB-->>Server: 酒店列表
    Server-->>AuditList: {list, total, stats}

    Admin->>AuditDetail: 点击酒店进入审核详情
    AuditDetail->>API: api.get('/api/admin/hotels/:id')
    Server-->>AuditDetail: 酒店完整信息
    AuditDetail->>API: api.get('/api/admin/requests?hotelId=:id')
    Server-->>AuditDetail: 该酒店关联的待审请求

    alt 通过审核
        Admin->>AuditDetail: 点击"通过"
        AuditDetail->>API: api.patch('/api/admin/hotels/:id/status', {status:'approved'})
        Server->>DB: 更新 hotels.status = 'approved'
        Server->>NotifySvc: 创建审核通过通知
        NotifySvc->>DB: 插入 notifications 表
    else 驳回
        Admin->>AuditDetail: 点击"驳回"→ 填写驳回原因
        AuditDetail->>API: api.patch('/api/admin/hotels/:id/status', {status:'rejected', rejectReason})
        Server->>DB: 更新 hotels.status = 'rejected'
        Server->>NotifySvc: 创建驳回通知
    else 下线
        Admin->>AuditDetail: 点击"下线"→ 填写下线原因
        AuditDetail->>API: api.patch('/api/admin/hotels/:id/status', {status:'offline', rejectReason})
        Server->>DB: 更新 hotels.status = 'offline'
    end

    AuditDetail->>AuditDetail: window.dispatchEvent('admin-pending-update')
    Note over AuditDetail: App.jsx 监听事件 → 刷新顶部待审数量
```

### 4.2 申请审核数据流（RequestAudit.jsx）

```mermaid
graph TB
    subgraph 页面状态
        ActiveTab["activeTab<br/>all / facility / room_type / promotion / hotel_delete"]
        URLParam["URL ?hotelId="]
        Pagination["page / pageSize / total"]
    end

    subgraph API层
        FetchReq["GET /api/admin/requests<br/>?type&hotelId&page&pageSize"]
        Approve["PUT /api/admin/requests/:id/review<br/>{action: 'approve'}"]
        Reject["PUT /api/admin/requests/:id/review<br/>{action: 'reject', rejectReason}"]
    end

    subgraph 后端处理
        ReviewSvc["requestService<br/>状态更新"]
        NotifySvc["notificationService<br/>审批通知"]
        PresetSvc["presetService<br/>写入预设数据"]
    end

    ActiveTab --> FetchReq
    URLParam --> FetchReq
    Pagination --> FetchReq
    Approve --> ReviewSvc
    Reject --> ReviewSvc
    ReviewSvc -->|通过时| PresetSvc
    ReviewSvc --> NotifySvc
```

### 4.3 管理员酒店详情（AdminHotelDetail.jsx）

```mermaid
graph LR
    subgraph 数据加载
        FetchHotel["GET /api/admin/hotels/:id"]
        FetchOverview["GET /api/admin/hotels/:id/overview"]
        FetchOrders["GET /api/admin/hotels/:id/orders"]
    end

    subgraph 管理操作
        Offline["PUT /api/admin/hotels/:id/offline<br/>{reason}"]
        Restore["PUT /api/admin/hotels/:id/restore"]
    end

    subgraph 页面视图
        HotelInfo["酒店基本信息<br/>图片轮播 + Descriptions"]
        Overview["房间概览<br/>环形图 + 统计"]
        RoomsTab["房型列表<br/>图片预览 + 折扣信息"]
        OrdersTab["订单列表<br/>分页"]
        PromotionView["优惠甘特图<br/>GanttTimeline"]
    end

    FetchHotel --> HotelInfo
    FetchHotel --> RoomsTab
    FetchHotel --> PromotionView
    FetchOverview --> Overview
    FetchOrders --> OrdersTab
    Offline -->|刷新| FetchHotel
    Restore -->|刷新| FetchHotel
```

## 5. 消息通知数据流

```mermaid
graph TB
    subgraph 消息来源["后端触发通知"]
        HotelApprove["酒店审核通过"]
        HotelReject["酒店审核驳回"]
        RequestApprove["申请审核通过"]
        RequestReject["申请审核拒绝"]
    end

    subgraph NotificationService["notificationService（前端）"]
        GetNotifs["getNotifications()"]
        GetUnread["getUnreadCount()"]
        MarkRead["markAsRead(id?)"]
        PubSub["订阅-发布<br/>listeners Set"]
    end

    subgraph UI["页面展示"]
        Badge["Header 未读徽标<br/>App.jsx"]
        MsgPage["消息中心<br/>Messages.jsx"]
    end

    HotelApprove -->|INSERT notifications| DB[(PostgreSQL)]
    HotelReject -->|INSERT notifications| DB
    RequestApprove -->|INSERT notifications| DB
    RequestReject -->|INSERT notifications| DB

    DB --> GetNotifs
    DB --> GetUnread
    GetUnread --> PubSub
    PubSub -->|onUnreadCountChange| Badge
    GetNotifs --> MsgPage
    MarkRead -->|更新后重新拉取| PubSub
```

## 6. 工作台数据流（Dashboard.jsx）

```mermaid
graph TB
    subgraph 管理员视图
        A_Stats["GET /api/admin/hotels?page=1&pageSize=1<br/>→ stats{total,approved,pending,offline}"]
    end

    subgraph 商户视图
        M_Stats["GET /api/merchant/hotels 按 status 拆分<br/>→ 4次请求获取各状态数量"]
        M_Overview["GET /api/merchant/hotels/overview<br/>→ 酒店统计/收入概览"]
        M_Cache["localStorage缓存<br/>dashboard_overview_cache_v1"]
    end

    subgraph 批量操作["批量操作（懒加载）"]
        LazyLoad["ensureHotelsLoaded()<br/>翻页合并全量酒店"]
        BatchDiscount["DashboardBatchModals<br/>批量折扣 / 批量房型"]
    end

    subgraph 展示
        StatCards["统计卡片<br/>待审核/已上架/已下线/总数"]
        OverviewTable["概览表格<br/>房间分布（商户）"]
        QuickActions["快捷操作<br/>新增酒店/进入审核"]
    end

    A_Stats --> StatCards
    M_Stats --> StatCards
    M_Overview --> OverviewTable
    M_Overview --> M_Cache
    M_Cache -.->|首屏快速渲染| OverviewTable
    LazyLoad --> BatchDiscount
```

## 7. 订单统计数据流（OrderStats.jsx）

```mermaid
graph LR
    subgraph API["并发请求"]
        FetchHotel["GET /api/{admin|merchant}/hotels/:id"]
        FetchStats["GET /api/{admin|merchant}/hotels/:id/order-stats"]
    end

    subgraph 数据转换
        StatusPie["statusStats → 饼图数据"]
        MonthlyBar["monthly → 柱图数据"]
        RoomTypeRank["roomTypeSummary → Top8 排序"]
        DailyArea["roomTypeDaily → 按日期聚合面积图"]
    end

    subgraph ECharts["ReactECharts（懒加载）"]
        PieChart["订单状态分布·饼图"]
        BarChart["月度营收·柱图"]
        MixChart["房型间夜/营收·柱+折线"]
        AreaChart["逐日营收·面积图"]
    end

    FetchHotel --> RoomTypeRank
    FetchStats --> StatusPie
    FetchStats --> MonthlyBar
    FetchStats --> RoomTypeRank
    FetchStats --> DailyArea

    StatusPie --> PieChart
    MonthlyBar --> BarChart
    RoomTypeRank --> MixChart
    DailyArea --> AreaChart
```

## 8. 请求层数据流详解

```mermaid
graph TB
    subgraph 页面组件
        Component["任意页面组件"]
    end

    subgraph api对象["api 对象（services/request.js）"]
        BuildKey["buildDebounceKey<br/>method + url + data + params → 唯一 key"]
        InflightMap["inflightMap<br/>请求去重：同 key 复用 Promise"]
        Axios["axios 实例"]
    end

    subgraph 拦截器
        ReqInterceptor["请求拦截器<br/>① localStorage 读取 token<br/>② 注入 Authorization: Bearer"]
        ResInterceptor["响应拦截器<br/>① 检查 data.success===false → reject<br/>② 检查 data.warning → 弹警告<br/>③ DEV 环境记录性能"]
        ErrHandler["错误处理<br/>① 懒加载 glassMessage<br/>② 弹出错误提示<br/>③ 401 → 跳转登录"]
    end

    Component -->|"api.get/post/put/patch/delete"| BuildKey
    BuildKey --> InflightMap
    InflightMap -->|"首次请求"| Axios
    InflightMap -.->|"重复请求 → 复用"| Component
    Axios --> ReqInterceptor
    ReqInterceptor -->|"HTTP 请求"| Server["Express API"]
    Server -->|"HTTP 响应"| ResInterceptor
    ResInterceptor -->|".then(res => res.data)"| Component
    ResInterceptor -->|"异常"| ErrHandler
    ErrHandler -->|"reject"| Component
```

## 9. 商户管理数据流（Merchants / MerchantDetail）

```mermaid
graph TB
    subgraph Merchants["商户列表页"]
        SearchMerchant["搜索：useRemoteTableQuery"]
        FetchMerchants["GET /api/user/merchants<br/>?page&pageSize&keyword"]
        ResetPwd1["POST /api/user/merchants/:id/reset-password"]
    end

    subgraph MerchantDetail["商户详情页"]
        FetchDetail["GET /api/user/merchants/:id<br/>含嵌套 hotels[]"]
        ResetPwd2["POST /api/user/merchants/:id/reset-password"]
        LocalStats["本地计算 stats<br/>hotels[] → {total, approved, pending, offline}"]
    end

    SearchMerchant --> FetchMerchants
    FetchMerchants --> MerchantTable["商户表格"]
    MerchantTable -->|"点击行"| FetchDetail
    FetchDetail --> LocalStats
    FetchDetail --> HotelTable["酒店列表（本地数据）"]
    HotelTable -->|"点击酒店"| AdminHotelDetail["导航 /admin-hotels/:id"]
```

## 10. i18n 数据流

```mermaid
sequenceDiagram
    participant Router as React Router
    participant App as App.jsx
    participant I18N as i18n Loader
    participant RouteCfg as routeConfig.js
    participant LazyRoute as LazyRoute 组件
    participant Page as 页面组件

    Router->>App: 路由变化 pathname
    App->>RouteCfg: getRouteNamespaces(pathname)
    RouteCfg-->>App: ['common', 'hotels', ...]
    App->>App: setRouteNamespacesReady(false)
    App->>I18N: loadNamespaces(namespaces)
    I18N-->>App: 加载完成
    App->>App: setRouteNamespacesReady(true)
    App->>LazyRoute: 渲染
    LazyRoute->>Page: Suspense → 懒加载组件
    Page->>I18N: t('hotels:title')
    I18N-->>Page: 翻译文本
```
