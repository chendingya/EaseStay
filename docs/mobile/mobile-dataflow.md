# Mobile 移动端 - 数据流图文档

> 本文档使用 Mermaid 图描述易宿酒店移动端（Taro + React + H5）的数据流转路径，覆盖全局请求链路、认证、搜索、订单、收藏、地图等核心模块。

## 1. 全局请求数据流

```mermaid
graph TB
    subgraph 页面层["页面层（12 个页面）"]
        Index["首页"]
        List["酒店列表"]
        Detail["酒店详情"]
        RoomDetail["房型详情"]
        Orders["订单列表"]
        OrderDetail["订单详情"]
        OrderPay["支付页"]
        Favorites["收藏"]
        MapPage["地图找房"]
        Login["登录"]
        Register["注册"]
        Account["我的"]
    end

    subgraph 服务层["Services 层"]
        AuthSvc["auth.js<br/>认证 + 订单"]
        FavSvc["favorites.js<br/>收藏操作"]
        RequestJS["request.js<br/>api.get / api.post / ..."]
    end

    subgraph 状态层["状态管理"]
        UserCtx["UserContext<br/>{user, isLogin, logout}"]
        UserStore["userStore<br/>双层缓存"]
        Storage["Taro Storage<br/>token / userRole / userInfo<br/>hotel_search_params"]
    end

    subgraph 后端["Server (Express)"]
        API["REST API<br/>:4100/api/*"]
    end

    Index & List & Detail & RoomDetail & MapPage -->|api.get| RequestJS
    Detail & RoomDetail -->|api.post /orders| RequestJS
    Orders & OrderDetail & OrderPay -->|getMyOrders / payOrder| AuthSvc
    Login & Register -->|loginByPassword / sendCode| AuthSvc
    Favorites -->|getFavoriteHotels / toggle| FavSvc
    Account -->|getCurrentUser| AuthSvc

    AuthSvc & FavSvc --> RequestJS
    RequestJS -->|1. 读 token| Storage
    RequestJS -->|2. 注入 Authorization| API
    API -->|3. JSON 响应| RequestJS
    RequestJS -->|4. 错误| GlassToast["glassToast<br/>全局提示"]

    AuthSvc -->|写入 token / userRole| Storage
    AuthSvc -->|set(user)| UserStore
    UserStore <-->|读写| Storage
    UserCtx -->|提供 user/isLogin| Index & Orders & Account & Detail
```

## 2. 认证数据流

```mermaid
sequenceDiagram
    participant U as 用户
    participant Page as 登录/注册页
    participant AuthSvc as auth.js
    participant Req as request.js
    participant Store as userStore
    participant Ctx as UserContext
    participant Storage as Taro Storage
    participant API as Server API

    Note over U,API: 登录流程
    U->>Page: 输入凭证
    Page->>AuthSvc: loginByPassword / loginByCode
    AuthSvc->>Req: api.post('/api/auth/login')
    Req->>Storage: 读 token (无)
    Req->>API: POST /api/auth/login
    API-->>Req: {token, userRole}
    Req-->>AuthSvc: 响应数据
    AuthSvc->>Storage: setStorageSync('token', token)
    AuthSvc->>Storage: setStorageSync('userRole', role)
    AuthSvc->>AuthSvc: getCurrentUser()
    AuthSvc->>Req: api.get('/api/user/me')
    Req->>Storage: 读 token ✓
    Req->>API: GET /api/user/me + Bearer
    API-->>Req: {id, username, role}
    Req-->>AuthSvc: 用户数据
    AuthSvc->>Store: userStore.set(user)
    Store->>Storage: setStorageSync('userInfo', user)
    AuthSvc->>Ctx: setUser(user) + setIsLogin(true)
    Page->>U: navigateBack / reLaunch

    Note over U,API: 冷启动恢复
    U->>Page: 打开 App
    Page->>Store: userStore.hasToken()
    Store->>Storage: getStorageSync('token')
    Storage-->>Store: token ✓
    Store-->>Page: true
    Page->>AuthSvc: getCurrentUser()
    AuthSvc->>API: GET /api/user/me + Bearer
    API-->>AuthSvc: 用户数据
    AuthSvc->>Store: userStore.set(user)
    AuthSvc->>Ctx: setUser + setIsLogin

    Note over U,API: 退出登录
    U->>Page: 点击退出
    Page->>Ctx: logout()
    Ctx->>Storage: removeStorageSync('token')
    Ctx->>Storage: removeStorageSync('userRole')
    Ctx->>Store: userStore.clear()
    Ctx->>Ctx: setUser(null) + setIsLogin(false)
```

## 3. 双层缓存数据流（userStore）

```mermaid
graph TB
    subgraph 读取路径["读取 userStore.get()"]
        Read["调用 get()"]
        MemCheck{"内存 _user<br/>是否存在?"}
        MemHit["返回 _user<br/>（毫秒级）"]
        StorageRead["Taro.getStorageSync<br/>('userInfo')"]
        Parse["JSON.parse"]
        WriteBack["写入内存 _user"]
        Return["返回用户数据"]
        Null["返回 null"]
    end

    Read --> MemCheck
    MemCheck -->|是| MemHit
    MemCheck -->|否| StorageRead
    StorageRead -->|有值| Parse --> WriteBack --> Return
    StorageRead -->|无值| Null

    subgraph 写入路径["写入 userStore.set(user)"]
        SetCall["调用 set(user)"]
        WriteMem["_user = user"]
        WriteStorage["Taro.setStorageSync<br/>('userInfo', JSON.stringify)"]
    end

    SetCall --> WriteMem --> WriteStorage

    subgraph 清除路径["清除 userStore.clear()"]
        ClearCall["调用 clear()"]
        ClearMem["_user = null"]
        ClearStorage["Taro.removeStorageSync<br/>('userInfo')"]
    end

    ClearCall --> ClearMem --> ClearStorage
```

## 4. 酒店搜索数据流

```mermaid
graph TB
    subgraph 首页["首页 index"]
        City["城市选择<br/>Cascader / 定位"]
        Date["日期选择<br/>Calendar"]
        Star["星级筛选<br/>0-5"]
        Price["价格区间<br/>Slider"]
        KW["关键字输入"]
        Tags["快捷标签<br/>来自 presets/facilities"]
        SearchBtn["搜索按钮"]
    end

    subgraph URLParams["URL 参数传递"]
        Params["city, keyword, checkIn,<br/>checkOut, stars, minPrice,<br/>maxPrice, tags, userLat, userLng"]
    end

    subgraph 列表页["列表页 list"]
        ParseParams["解析 URL 参数<br/>Taro.getCurrentInstance()"]
        Sort["排序切换<br/>recommend/price_asc/price_desc/star"]
        Filter["筛选 Dropdown<br/>stars + tags"]
        ListAPI["api.get('/api/hotels')"]
        ResultList["搜索结果列表"]
        RecList["推荐酒店列表"]
        ScrollLoad["滚动加载更多"]
    end

    subgraph 缓存["本地缓存"]
        SearchCache["Taro Storage<br/>hotel_search_params"]
    end

    subgraph Server["Server"]
        HotelAPI["GET /api/hotels<br/>hotelService.searchHotels"]
    end

    City & Date & Star & Price & KW & Tags --> SearchBtn
    SearchBtn -->|navigateTo| Params
    SearchBtn -->|持久化| SearchCache
    Params -->|URL query string| ParseParams
    ParseParams --> Sort & Filter
    Sort & Filter --> ListAPI
    ListAPI -->|page=1| HotelAPI
    HotelAPI -->|{page, pageSize, total, list}| ResultList
    ScrollLoad -->|page++| ListAPI
    ListAPI -->|无搜索参数| RecList

    SearchCache -.->|首次打开恢复| ParseParams
```

## 5. 酒店详情数据流

```mermaid
graph TB
    subgraph 入口["进入详情"]
        FromList["列表页<br/>HotelCard 点击"]
        FromFav["收藏页<br/>HotelCard 点击"]
        FromMap["地图页<br/>卡片点击"]
    end

    subgraph URLParam["URL 参数"]
        ID["hotelId"]
        CI["checkIn"]
        CO["checkOut"]
    end

    subgraph DetailPage["详情页 detail"]
        FetchHotel["api.get('/api/hotels/:id<br/>?checkIn=&checkOut=')"]
        HotelState["hotel state"]
        FavCheck["isFavoriteHotel(id)"]
        CollectedState["collected state"]
    end

    subgraph 数据处理["数据加工"]
        MergeSlides["合并幻灯片<br/>酒店图 + 房型图<br/>URL 去重"]
        RoomFilter["房型筛选<br/>roomTypeId / rooms / guests"]
        PriceCalc["价格计算<br/>折扣率 × 基础价"]
        PromoDisplay["优惠展示<br/>折扣标签 + 有效期"]
    end

    subgraph 子组件["渲染组件"]
        Hero["Hero 大图<br/>Swiper + 模糊背景"]
        InfoCard["酒店信息卡"]
        PromoCard["促销卡片"]
        RoomList["房型列表<br/>RoomTypeCard × N"]
        FacTag["设施标签"]
        Nearby["周边信息"]
        BottomBar["BookingBottomBar<br/>最低价 + 预订"]
    end

    FromList & FromFav & FromMap -->|navigateTo| URLParam
    URLParam --> FetchHotel
    FetchHotel -->|服务端返回| HotelState
    URLParam --> FavCheck
    FavCheck --> CollectedState

    HotelState --> MergeSlides --> Hero
    HotelState --> RoomFilter --> RoomList
    HotelState --> PriceCalc --> BottomBar
    HotelState --> PromoDisplay --> PromoCard
    HotelState --> InfoCard & FacTag & Nearby
```

## 6. 订单流转数据流

```mermaid
sequenceDiagram
    participant U as 用户
    participant Detail as 详情/房型页
    participant API as Server API
    participant PayPage as 支付页
    participant OrderList as 订单列表
    participant OrderDetail as 订单详情

    Note over U,OrderDetail: 创建订单
    U->>Detail: 点击"预订"
    Detail->>Detail: 检查 isLogin
    alt 未登录
        Detail->>U: 跳转登录页
    end
    Detail->>API: POST /api/hotels/:id/orders<br/>{roomTypeId, quantity, checkIn, checkOut}
    API-->>Detail: {id, order_no, status:'pending_payment'}
    Detail->>PayPage: reLaunch → /order-pay?id=

    Note over U,OrderDetail: 支付流程
    PayPage->>API: GET /api/user/orders/:id
    API-->>PayPage: 订单详情
    U->>PayPage: 选择支付方式(微信/支付宝/银行卡)
    PayPage->>API: POST /api/user/orders/:id/pay {channel}
    API-->>PayPage: {status:'confirmed'}
    PayPage->>OrderList: reLaunch → /orders?tab=confirmed

    Note over U,OrderDetail: 订单操作
    U->>OrderList: 查看订单
    OrderList->>API: GET /api/user/orders?page=&status=
    API-->>OrderList: {list, total, hasMore}
    U->>OrderDetail: 点击订单卡片
    OrderDetail->>API: GET /api/user/orders/:id
    API-->>OrderDetail: 订单详情

    alt 待付款
        U->>OrderDetail: 去支付
        OrderDetail->>PayPage: navigateTo → /order-pay?id=
    else 待使用
        U->>OrderDetail: 确认使用
        OrderDetail->>API: POST /api/user/orders/:id/use
        API-->>OrderDetail: {status:'finished'}
        OrderDetail->>OrderList: reLaunch → /orders?tab=finished
    else 待使用
        U->>OrderDetail: 取消订单
        OrderDetail->>API: POST /api/user/orders/:id/cancel
        API-->>OrderDetail: {status:'cancelled'}
        OrderDetail->>OrderList: reLaunch → /orders?tab=cancelled
    end
```

## 7. 收藏功能数据流

```mermaid
graph TB
    subgraph 详情页["酒店详情页"]
        HeartBtn["收藏按钮<br/>❤ / ♡"]
        CheckFav["isFavoriteHotel(id)<br/>进入时查询"]
        ToggleFav["toggleFavoriteHotel(hotel)<br/>点击切换"]
    end

    subgraph 收藏页["收藏列表页"]
        FavList["getFavoriteHotels()<br/>useDidShow 刷新"]
        SwipeDelete["左滑删除<br/>removeFavoriteHotel(id)"]
        ClearAll["清空全部<br/>clearFavoriteHotels()"]
        SortByTime["按 savedAt 降序排列"]
    end

    subgraph FavService["favorites.js"]
        IsFav["GET /api/user/favorites/:id"]
        AddFav["POST /api/user/favorites"]
        RemoveFav["DELETE /api/user/favorites/:id"]
        GetAll["GET /api/user/favorites"]
        ClearAPI["DELETE /api/user/favorites"]
    end

    subgraph Server["Server → Supabase"]
        FavTable["favorite_hotels 表<br/>{user_id, hotel_id}"]
    end

    CheckFav --> IsFav --> FavTable
    ToggleFav -->|已收藏| RemoveFav --> FavTable
    ToggleFav -->|未收藏| AddFav --> FavTable
    HeartBtn --> ToggleFav

    FavList --> GetAll --> FavTable
    GetAll -->|返回列表| SortByTime
    SwipeDelete --> RemoveFav
    ClearAll --> ClearAPI --> FavTable
```

## 8. 地图找房数据流

```mermaid
graph TB
    subgraph 入口["进入地图"]
        FromIndex["首页地图入口"]
        FromList["列表页地图入口"]
    end

    subgraph MapPage["地图页 map"]
        SearchInput["搜索框<br/>400ms 防抖"]
        FilterBar["筛选栏<br/>sort / stars / tags / price"]
        MapView["AMap 地图实例<br/>动态加载 SDK"]
        HotelMarkers["酒店价格气泡标记<br/>buildBubbleEl"]
        POIMarker["POI 搜索标记"]
        CardList["底部横向酒店卡片"]
        ActiveId["选中酒店 ID"]
    end

    subgraph APIs["API 调用"]
        SearchPOI["GET /api/map/search<br/>?keywords="]
        FetchHotels["GET /api/map/hotel-locations<br/>?city&targetLng&targetLat<br/>&sort&stars&tags<br/>&minPrice&maxPrice"]
        FetchTags["GET /api/presets/facilities"]
    end

    FromIndex & FromList -->|city, checkIn, checkOut| MapPage
    SearchInput -->|keyword| SearchPOI
    SearchPOI -->|POI 列表| POIMarker
    FilterBar & POIMarker -->|筛选 + 坐标| FetchHotels
    FetchHotels -->|酒店坐标列表| HotelMarkers
    FetchHotels -->|酒店数据| CardList
    FetchTags -->|设施列表| FilterBar

    HotelMarkers -->|点击气泡| ActiveId
    CardList -->|点击卡片| ActiveId
    ActiveId -->|地图居中 + 高亮| MapView
    CardList -->|点击| Detail["→ 详情页<br/>navigateTo"]
```

## 9. 图片优化数据流

```mermaid
graph LR
    subgraph 组件["图片引用组件"]
        HotelCard["HotelCard<br/>112×132"]
        DetailHero["详情 Hero<br/>全宽"]
        RoomCard["RoomTypeCard<br/>84×84"]
    end

    subgraph Resolve["resolveImageUrl()"]
        Input["原始 URL"]
        Check{"已是代理 URL?"}
        Build["构造代理参数<br/>w, h, q, fmt=webp"]
        Output["代理 URL"]
    end

    subgraph Proxy["Server 图片代理"]
        ImageAPI["GET /api/image<br/>?url=&w=&h=&q=&fmt="]
        Sharp["Sharp 压缩<br/>resize + format"]
    end

    HotelCard -->|resolveImageUrl<br/>(url, {w:112,h:132})| Resolve
    DetailHero -->|resolveImageUrl<br/>(url, {w:750})| Resolve
    RoomCard -->|resolveImageUrl<br/>(url, {w:84,h:84})| Resolve
    Input --> Check
    Check -->|否| Build --> Output
    Check -->|是| Output
    Output --> ImageAPI --> Sharp
    Sharp -->|压缩后图片| HotelCard & DetailHero & RoomCard
```

## 10. Toast 通知数据流

```mermaid
graph TB
    subgraph 触发源["触发来源"]
        RequestErr["request.js<br/>请求错误"]
        BizLogic["业务逻辑<br/>登录成功 / 收藏操作"]
    end

    subgraph GlassToastSvc["glassToast 服务"]
        Show["glassToast.show(msg, type)"]
        PlatformCheck{"H5 平台?"}
        Listeners["通知 listeners<br/>subscribeGlassToast"]
        TaroToast["Taro.showToast<br/>小程序原生"]
    end

    subgraph Host["GlassToastHost 组件<br/>（App 根级渲染）"]
        Queue["toast 队列<br/>最多 4 条"]
        Render["渲染毛玻璃卡片<br/>图标 + 消息"]
        Timer["自动移除<br/>2200ms"]
        Animation["进入/离开动画<br/>CSS transition"]
    end

    RequestErr -->|error(msg)| Show
    BizLogic -->|success/warning/info| Show
    Show --> PlatformCheck
    PlatformCheck -->|H5| Listeners --> Queue
    PlatformCheck -->|小程序| TaroToast
    Queue --> Render --> Timer
    Render --> Animation
```

## 11. 页间数据传递总览

```mermaid
graph LR
    subgraph URL["URL Params 传递"]
        direction TB
        I2L["首页 → 列表<br/>city, keyword, checkIn, checkOut,<br/>stars, minPrice, maxPrice,<br/>tags, userLat, userLng"]
        L2D["列表 → 详情<br/>id, checkIn, checkOut"]
        D2R["详情 → 房型<br/>hotelId, roomId,<br/>checkIn, checkOut"]
        D2P["详情/房型 → 支付<br/>orderId"]
        O2D["订单列表 → 订单详情<br/>orderId"]
        OD2P["订单详情 → 支付<br/>orderId"]
        I2M["首页/列表 → 地图<br/>city, checkIn, checkOut"]
    end

    subgraph Storage["Taro Storage"]
        direction TB
        Token["token<br/>JWT 令牌"]
        Role["userRole<br/>用户角色"]
        Info["userInfo<br/>用户信息 JSON"]
        SearchParams["hotel_search_params<br/>搜索参数快照"]
    end

    subgraph Context["React Context"]
        direction TB
        UserCtx2["UserContext<br/>user / isLogin / logout<br/>所有页面共享"]
    end

    subgraph Lifecycle["生命周期刷新"]
        direction TB
        DidShow["useDidShow<br/>每次页面显示时<br/>重新拉取数据"]
    end
```

## 12. 下拉刷新与分页加载数据流

```mermaid
sequenceDiagram
    participant U as 用户
    participant Page as 页面 (orders/list/index)
    participant OL as OrderList / ListContainer
    participant API as Server API

    Note over U,API: 初始加载
    Page->>API: 请求第 1 页
    API-->>Page: {list, total, hasMore: true}
    Page->>OL: items={list}, hasMore=true

    Note over U,API: 滚动加载更多
    U->>OL: 滚动到底部
    OL->>OL: onScrollToLower
    OL->>Page: onLoadMore()
    Page->>API: 请求第 N+1 页
    API-->>Page: {list: newItems}
    Page->>Page: mergeOrders 去重合并
    Page->>OL: items={merged}, hasMore

    Note over U,API: 下拉刷新 (H5)
    U->>OL: 下拉触摸
    OL->>OL: touchStart → touchMove → pullDistance
    alt pullDistance > threshold
        OL->>Page: onRefresh()
        Page->>API: 请求第 1 页
        API-->>Page: 全新数据
        Page->>OL: items={fresh}, refreshing=false
    else 未达阈值
        OL->>OL: 回弹复位
    end
```
