# Server 后端 - 数据流图文档

> 本文档描述后端服务（server）各模块间的数据流向，涵盖请求入口、中间件链、控制器、服务层到数据库的完整链路。

## 1. 全局请求数据流

```mermaid
graph TB
    subgraph Clients["客户端"]
        Mobile["移动端 Taro"]
        Admin["管理端 React"]
    end

    subgraph Express["Express Server"]
        CORS["cors()"]
        JSON["express.json<br/>limit: 2mb"]
        Swagger["/api-docs<br/>Swagger UI"]
        Health["/health"]
        Status["/status<br/>HTML 状态页"]

        subgraph Middleware["中间件层"]
            AuthRequired["authRequired<br/>JWT 校验 → req.user"]
            RequireRole["requireRole(role)<br/>角色校验"]
            AuthOptional["authOptional<br/>可选认证"]
        end

        subgraph Router["路由聚合层 routes/index.js"]
            AuthRoutes["/api/auth"]
            UserRoutes["/api/user"]
            NotifRoutes["/api/notifications"]
            MerchantRoutes["/api/merchant/hotels"]
            AdminRoutes["/api/admin/hotels"]
            PublicRoutes["/api/hotels"]
            RequestRoutes["/api/requests"]
            AdminReqRoutes["/api/admin/requests"]
            PresetRoutes["/api/presets"]
            AdminPresetRoutes["/api/admin/presets"]
            MapRoutes["/api/map"]
            ImageRoutes["/api/image"]
        end

        subgraph Controllers["控制器层"]
            AuthCtrl["authController"]
            MerchantCtrl["merchantHotelsController"]
            AdminCtrl["adminHotelsController"]
            PublicCtrl["publicHotelsController"]
            ReqCtrl["requestController"]
            PresetCtrl["presetController"]
            NotifCtrl["notificationController"]
            MapCtrl["mapController"]
            UserCtrl["userController"]
            StatusCtrl["statusController"]
            ImageCtrl["imageController"]
        end

        subgraph Services["服务层"]
            AuthSvc["authService"]
            HotelSvc["hotelService<br/>核心业务"]
            ReqSvc["requestService"]
            NotifSvc["notificationService"]
            PresetSvc["presetService"]
            MapSvc["mapService"]
            PricingSvc["pricingService<br/>定价引擎"]
            RoomAvailSvc["roomAvailabilityService<br/>库存计算"]
            SmsSvc["smsService"]
        end
    end

    subgraph DataLayer["数据层"]
        DB[(Supabase PostgreSQL)]
        AmapAPI["高德地图 API"]
    end

    Clients -->|HTTP/REST| CORS
    CORS --> JSON
    JSON --> Router

    AuthRoutes --> AuthCtrl
    MerchantRoutes -->|authRequired + merchant| MerchantCtrl
    AdminRoutes -->|authRequired + admin| AdminCtrl
    PublicRoutes --> PublicCtrl
    RequestRoutes -->|authRequired| ReqCtrl
    AdminReqRoutes -->|authRequired + admin| ReqCtrl
    NotifRoutes -->|authRequired| NotifCtrl
    PresetRoutes --> PresetCtrl
    AdminPresetRoutes -->|authRequired + admin| PresetCtrl
    MapRoutes --> MapCtrl
    UserRoutes --> UserCtrl
    ImageRoutes --> ImageCtrl

    AuthCtrl --> AuthSvc
    AuthCtrl --> SmsSvc
    MerchantCtrl --> HotelSvc
    AdminCtrl --> HotelSvc
    PublicCtrl --> HotelSvc
    ReqCtrl --> ReqSvc
    NotifCtrl --> NotifSvc
    PresetCtrl --> PresetSvc
    MapCtrl --> MapSvc

    HotelSvc --> PricingSvc
    HotelSvc --> RoomAvailSvc
    HotelSvc --> NotifSvc
    HotelSvc --> MapSvc
    ReqSvc --> NotifSvc
    ReqSvc --> HotelSvc

    Services --> DB
    MapSvc --> AmapAPI
```

## 2. 认证数据流

```mermaid
sequenceDiagram
    participant Client as 客户端
    participant MW as authRequired 中间件
    participant Ctrl as authController
    participant SmsSvc as smsService
    participant AuthSvc as authService
    participant DB as PostgreSQL

    Note over Client,DB: 发送验证码
    Client->>Ctrl: POST /api/auth/sms/send {username}
    Ctrl->>SmsSvc: sendCode({username})
    SmsSvc->>DB: DELETE sms_codes WHERE username（清旧码）
    SmsSvc->>DB: INSERT sms_codes {username, code, expires_at}
    DB-->>SmsSvc: 插入成功
    SmsSvc-->>Client: {code, expiresAt}（演示模式直接返回）

    Note over Client,DB: 用户注册
    Client->>Ctrl: POST /api/auth/register {username, password, role, code}
    Ctrl->>AuthSvc: register(...)
    AuthSvc->>DB: SELECT sms_codes WHERE username AND code
    DB-->>AuthSvc: 验证码记录
    AuthSvc->>AuthSvc: 校验过期时间
    AuthSvc->>DB: SELECT users WHERE username（唯一性校验）
    AuthSvc->>AuthSvc: bcrypt.hash(password, 10)
    AuthSvc->>DB: INSERT users {username, password_hash, role}
    DB-->>AuthSvc: 新用户
    AuthSvc-->>Client: {id, username, role}

    Note over Client,DB: 用户登录
    Client->>Ctrl: POST /api/auth/login {username, password}
    Ctrl->>AuthSvc: login(...)
    AuthSvc->>DB: SELECT users WHERE username
    DB-->>AuthSvc: {password_hash, role, ...}
    AuthSvc->>AuthSvc: bcrypt.compare(password, hash)
    AuthSvc->>AuthSvc: signToken({id, role, username})
    AuthSvc-->>Client: {token, userRole}

    Note over Client,DB: 后续请求鉴权
    Client->>MW: Authorization: Bearer <token>
    MW->>MW: verifyToken(token)
    MW->>MW: req.user = {id, role, username}
    MW->>Ctrl: next()
```

## 3. 酒店管理数据流

### 3.1 创建酒店（商户）

```mermaid
sequenceDiagram
    participant Merchant as 商户前端
    participant Ctrl as merchantHotelsController
    participant HotelSvc as hotelService
    participant PricingSvc as pricingService
    participant DB as PostgreSQL

    Merchant->>Ctrl: POST /api/merchant/hotels {...hotelData, roomTypes}
    Ctrl->>HotelSvc: createHotel(merchantId, data)

    HotelSvc->>HotelSvc: normalizeCityName(city)
    HotelSvc->>DB: SELECT hotels WHERE name AND merchant_id（名称唯一校验）
    HotelSvc->>DB: INSERT hotels {name, city, status:'pending', ...}
    DB-->>HotelSvc: newHotel

    loop 每个房型
        HotelSvc->>HotelSvc: 计算最佳折扣分配
        HotelSvc->>DB: INSERT room_types {hotel_id, name, price, stock, ...}
    end

    DB-->>HotelSvc: 完整酒店+房型
    HotelSvc-->>Merchant: {hotel, roomTypes}
```

### 3.2 酒店列表查询（支持分页）

```mermaid
graph TB
    subgraph 请求参数
        Page["page / pageSize<br/>（可选，不传返回数组）"]
        Filters["status / city / keyword"]
    end

    subgraph hotelService
        Query["构建 Supabase 查询"]
        Filter["应用筛选条件"]
        Paginate["计算分页 offset/limit"]
        FetchRooms["批量查询 room_types"]
        CalcPrice["getLowestPrices()<br/>批量计算最低价"]
        CountRooms["getRoomTypeCountMap()<br/>房型数量"]
    end

    subgraph PricingService
        CalcRoom["calculateRoomPrice()<br/>基础价 → 促销价 → 折扣价"]
        CheckPeriod["isPeriodEffective()<br/>折扣时段有效性"]
    end

    subgraph 响应格式
        OldFormat["无分页参数 →<br/>Hotel[]（纯数组）"]
        NewFormat["有分页参数 →<br/>{page, pageSize, total, list}"]
    end

    Page --> Query
    Filters --> Filter
    Query --> Filter --> Paginate
    Paginate --> FetchRooms
    FetchRooms --> CalcPrice
    CalcPrice --> PricingService
    CalcPrice --> CountRooms

    CountRooms --> OldFormat
    CountRooms --> NewFormat
```

### 3.3 公开酒店智能搜索

```mermaid
sequenceDiagram
    participant Client as 移动端
    participant Ctrl as publicHotelsController
    participant HotelSvc as hotelService
    participant MapSvc as mapService
    participant PricingSvc as pricingService
    participant DB as PostgreSQL

    Client->>Ctrl: GET /api/hotels?city=上海&keyword=外滩&tags=WiFi&sort=recommend
    Ctrl->>HotelSvc: listPublicHotels(query)

    HotelSvc->>HotelSvc: normalizeCityName('上海') → '上海市'

    alt keyword 存在
        HotelSvc->>MapSvc: geocode(keyword, city)
        MapSvc-->>HotelSvc: {lat, lng}（目标坐标）
    end

    HotelSvc->>DB: SELECT hotels WHERE status='approved' AND city
    DB-->>HotelSvc: 候选酒店列表

    HotelSvc->>DB: SELECT room_types WHERE hotel_id IN (...)
    DB-->>HotelSvc: 房型列表

    HotelSvc->>PricingSvc: 批量计算最低价
    PricingSvc-->>HotelSvc: 价格映射

    alt keyword 存在
        HotelSvc->>HotelSvc: 文本相关性评分（名称/地址/设施匹配）
        HotelSvc->>HotelSvc: 距离加权（Haversine）
        HotelSvc->>HotelSvc: 标签命中加分
        HotelSvc->>HotelSvc: 综合评分排序
    else 无 keyword
        HotelSvc->>HotelSvc: applyTagAwareSort<br/>标签命中数 → 二级排序（recommend/price/star）
    end

    HotelSvc->>HotelSvc: 应用筛选（stars/price/tags/rooms/guests）
    HotelSvc->>HotelSvc: 分页截取
    HotelSvc-->>Client: {page, pageSize, total, list}
```

## 4. 订单创建数据流

```mermaid
sequenceDiagram
    participant User as 用户（移动端）
    participant Ctrl as publicHotelsController
    participant HotelSvc as hotelService
    participant PricingSvc as pricingService
    participant RoomSvc as roomAvailabilityService
    participant DB as PostgreSQL

    User->>Ctrl: POST /api/hotels/:id/orders {roomTypeId, quantity, checkIn, checkOut}
    Ctrl->>HotelSvc: createPublicOrder(userId, hotelId, body)

    HotelSvc->>DB: SELECT hotels WHERE id AND status='approved'
    DB-->>HotelSvc: hotel（含 promotions）

    HotelSvc->>DB: SELECT room_types WHERE id AND hotel_id
    DB-->>HotelSvc: roomType

    HotelSvc->>RoomSvc: getActiveOrderQtyMap({roomTypeIds, checkIn, checkOut})
    RoomSvc->>DB: SELECT orders WHERE room_type_id AND 日期重叠 AND status IN (...)
    DB-->>RoomSvc: 占用量
    RoomSvc-->>HotelSvc: {roomTypeId: usedQty}

    HotelSvc->>HotelSvc: 计算可用库存 = stock - usedQty - offline
    HotelSvc->>HotelSvc: 校验库存充足

    HotelSvc->>PricingSvc: calculateRoomPrice({room, promotions, checkIn, checkOut})
    PricingSvc-->>HotelSvc: {finalPrice, appliedDiscount}

    HotelSvc->>HotelSvc: 计算总价 = finalPrice × quantity × nights

    alt 有折扣配额
        HotelSvc->>HotelSvc: 分配折扣配额
    end

    HotelSvc->>DB: INSERT orders {order_no, hotel_id, room_type_id, total_price, status:'pending_payment', ...}
    DB-->>HotelSvc: newOrder

    alt 折扣配额已消耗
        HotelSvc->>DB: UPDATE room_types SET discount_quota -= quantity
    end

    HotelSvc-->>User: {order_no, total_price, status:'pending_payment', ...}
```

## 5. 审核流数据流

### 5.1 酒店审核

```mermaid
sequenceDiagram
    participant Admin as 管理员前端
    participant Ctrl as adminHotelsController
    participant HotelSvc as hotelService
    participant NotifSvc as notificationService
    participant DB as PostgreSQL

    Admin->>Ctrl: PATCH /api/admin/hotels/:id/status {status, rejectReason?}
    Ctrl->>HotelSvc: updateHotelStatus(hotelId, status, rejectReason)

    HotelSvc->>DB: SELECT hotels WHERE id
    DB-->>HotelSvc: hotel (含 merchant_id)

    alt status = 'approved'
        HotelSvc->>DB: UPDATE hotels SET status='approved', reject_reason=NULL
        HotelSvc->>NotifSvc: sendNotification(merchant_id, hotelApproved)
    else status = 'rejected'
        HotelSvc->>DB: UPDATE hotels SET status='rejected', reject_reason=reason
        HotelSvc->>NotifSvc: sendNotification(merchant_id, hotelRejected)
    else status = 'offline'
        HotelSvc->>DB: UPDATE hotels SET status='offline', reject_reason=reason
        HotelSvc->>NotifSvc: sendNotification(merchant_id, hotelOffline)
    else status = 'restore'
        HotelSvc->>DB: UPDATE hotels SET status='approved', reject_reason=NULL
        HotelSvc->>NotifSvc: sendNotification(merchant_id, hotelRestored)
    end

    NotifSvc->>DB: INSERT notifications {user_id, title, content, type}
    HotelSvc-->>Admin: 更新后的酒店数据
```

### 5.2 申请审核

```mermaid
sequenceDiagram
    participant Admin as 管理员前端
    participant Ctrl as requestController
    participant ReqSvc as requestService
    participant NotifSvc as notificationService
    participant DB as PostgreSQL

    Admin->>Ctrl: PUT /api/admin/requests/:id/review {action, rejectReason?}
    Ctrl->>ReqSvc: reviewRequest(requestId, action, rejectReason)

    ReqSvc->>DB: SELECT requests WHERE id
    DB-->>ReqSvc: request（含 type, data, hotel_id, merchant_id）

    alt action = 'approve'
        alt type = 'facility'
            ReqSvc->>DB: SELECT hotels WHERE id
            ReqSvc->>DB: UPDATE hotels SET facilities = facilities || newFacility
        else type = 'room_type'
            ReqSvc->>DB: INSERT room_types {hotel_id, name, price, stock, ...}
        else type = 'promotion'
            ReqSvc->>DB: SELECT hotels WHERE id
            ReqSvc->>DB: UPDATE hotels SET promotions = promotions || newPromo
        else type = 'hotel_delete'
            ReqSvc->>DB: DELETE orders WHERE hotel_id
            ReqSvc->>DB: DELETE room_types WHERE hotel_id
            ReqSvc->>DB: DELETE hotels WHERE id
        end
        ReqSvc->>DB: UPDATE requests SET status='approved'
        ReqSvc->>NotifSvc: sendNotification(merchant_id, requestApproved)
    else action = 'reject'
        ReqSvc->>DB: UPDATE requests SET status='rejected', reject_reason
        ReqSvc->>NotifSvc: sendNotification(merchant_id, requestRejected)
    end

    NotifSvc->>DB: INSERT notifications
    ReqSvc-->>Admin: 审核结果
```

## 6. 通知数据流

```mermaid
graph TB
    subgraph 触发源["触发源（Service 层）"]
        HotelApprove["hotelService<br/>酒店审核通过/驳回/下/恢复"]
        RequestReview["requestService<br/>申请审核通过/拒绝"]
    end

    subgraph NotifService["notificationService"]
        Send["sendNotification(userId, template)"]
        SendBatch["sendNotifications(batch)"]
        Templates["NotificationTemplates<br/>8 种通知模板"]
    end

    subgraph DB["PostgreSQL"]
        NotifTable["notifications 表<br/>user_id / title / content / type / is_read"]
    end

    subgraph ReadPath["读取链路"]
        GetList["getUserNotifications(userId, {unreadOnly})"]
        GetCount["getUnreadCount(userId)"]
        MarkRead["markAsRead({userId, notificationId?})"]
    end

    subgraph Frontend["前端消费"]
        Badge["Header 未读徽标"]
        MsgPage["消息中心页"]
    end

    HotelApprove -->|调用| Send
    RequestReview -->|调用| Send
    Send --> Templates
    Templates -->|INSERT| NotifTable
    SendBatch -->|批量 INSERT| NotifTable

    NotifTable --> GetList
    NotifTable --> GetCount
    MarkRead -->|UPDATE is_read=true| NotifTable

    GetList --> MsgPage
    GetCount --> Badge
```

## 7. 定价引擎数据流

```mermaid
graph TB
    subgraph Input["输入"]
        Room["room_type<br/>price / discount_rate / discount_quota / discount_periods"]
        Promos["hotel.promotions[]<br/>type / value / startDate / endDate"]
        Dates["checkIn / checkOut / asOfDate"]
    end

    subgraph PricingService["pricingService"]
        Step1["① 基础价格<br/>room.price"]
        Step2["② getEffectivePromotions()<br/>筛选当前有效促销"]
        Step3["③ 叠加促销折扣<br/>遍历有效促销逐个应用 applyDiscountValue"]
        Step4["④ isPeriodEffective()<br/>检查房型折扣时段是否有效"]
        Step5["⑤ 应用房型折扣<br/>discount_rate (0-10 折率 / 负数直减)"]
        Step6["⑥ 最终价格<br/>Math.max(finalPrice, 0)"]
    end

    subgraph Output["输出"]
        FinalPrice["finalPrice<br/>最终每晚房价"]
        AppliedDiscount["appliedDiscount<br/>是否应用了折扣"]
        BasePrice["basePrice<br/>原始房价"]
    end

    Room --> Step1
    Promos --> Step2
    Dates --> Step2
    Step1 --> Step3
    Step2 --> Step3
    Step3 --> Step4
    Dates --> Step4
    Step4 -->|有效| Step5
    Step4 -->|无效| Step6
    Room --> Step5
    Step5 --> Step6
    Step6 --> FinalPrice
    Step6 --> AppliedDiscount
    Step1 --> BasePrice
```

## 8. 库存可用性数据流

```mermaid
graph TB
    subgraph Input["查询输入"]
        RoomTypeIds["roomTypeIds[]"]
        DateRange["checkIn / checkOut"]
        AsOfDate["asOfDate（基准日期）"]
    end

    subgraph RoomAvailabilityService["roomAvailabilityService"]
        QueryOrders["getActiveOrderQtyMap()<br/>查询占用库存的订单"]
        Filter["筛选条件：<br/>status IN (pending_payment, confirmed, finished)<br/>AND check_out > checkIn<br/>AND check_in < checkOut"]
        Aggregate["按 room_type_id 聚合 SUM(quantity)"]
        Compute["computeRoomAvailability()<br/>available = stock - used - offline"]
    end

    subgraph DB["PostgreSQL"]
        Orders["orders 表"]
        RoomTypes["room_types 表<br/>stock / used_stock / offline_stock"]
    end

    subgraph Output["输出"]
        QtyMap["{roomTypeId: occupiedQty}"]
        Availability["{total, used, available, offline}"]
    end

    RoomTypeIds --> QueryOrders
    DateRange --> Filter
    AsOfDate --> Filter
    QueryOrders --> Filter
    Filter -->|SELECT orders| Orders
    Orders --> Aggregate
    Aggregate --> QtyMap
    QtyMap --> Compute
    RoomTypes --> Compute
    Compute --> Availability
```

## 9. 地图服务数据流

```mermaid
graph TB
    subgraph MapService["mapService"]
        Geocode["geocode(address, city)<br/>地址 → 坐标"]
        Regeocode["regeocode(location)<br/>坐标 → 地址"]
        SearchPOI["searchPOI(keywords, city)<br/>POI 关键词搜索"]
        HotelLoc["getHotelLocations(city, target, filters)<br/>城市酒店坐标"]
        Cache["geocodeCache (内存)<br/>地理编码缓存"]
    end

    subgraph External["外部 API"]
        AmapGeocode["高德 geocode API"]
        AmapRegeo["高德 regeo API"]
        AmapPlace["高德 place/text API"]
    end

    subgraph Fallback["降级策略"]
        MockData["mockHotelLocations.js<br/>4 城市 × 10 酒店 mock 数据"]
        MockGeo["模拟坐标返回"]
    end

    subgraph DB["PostgreSQL"]
        Hotels["hotels 表<br/>status='approved'"]
    end

    Geocode -->|有 AMAP_KEY| AmapGeocode
    Geocode -->|无 AMAP_KEY| MockGeo
    Geocode --> Cache

    Regeocode --> AmapRegeo
    SearchPOI -->|有 AMAP_KEY| AmapPlace
    SearchPOI -->|无 AMAP_KEY| MockData

    HotelLoc --> Hotels
    HotelLoc -->|DB 无数据| MockData
    HotelLoc -->|计算最低价| PricingSvc["pricingService"]
    HotelLoc -->|Haversine 距离| Sort["筛选 + 排序"]
```

## 10. 用户订单生命周期数据流

```mermaid
sequenceDiagram
    participant User as 用户（移动端）
    participant Ctrl as userController
    participant DB as PostgreSQL

    Note over User,DB: 查看订单列表
    User->>Ctrl: GET /api/user/orders?page=1&pageSize=10&status=pending_payment
    Ctrl->>DB: SELECT orders WHERE user_id ORDER BY created_at DESC
    Ctrl->>DB: SELECT hotels WHERE id IN (...)（补充酒店信息）
    DB-->>User: {page, pageSize, total, list}

    Note over User,DB: 模拟支付
    User->>Ctrl: POST /api/user/orders/:id/pay {channel: 'wechat'}
    Ctrl->>DB: SELECT orders WHERE id AND user_id AND status='pending_payment'
    Ctrl->>DB: UPDATE orders SET status='confirmed', paid_at=NOW()
    DB-->>User: 更新后的订单

    Note over User,DB: 确认使用（核销）
    User->>Ctrl: POST /api/user/orders/:id/use
    Ctrl->>DB: SELECT orders WHERE id AND user_id AND status='confirmed'
    Ctrl->>DB: UPDATE orders SET status='finished'
    DB-->>User: 更新后的订单

    Note over User,DB: 取消订单
    User->>Ctrl: POST /api/user/orders/:id/cancel
    Ctrl->>DB: SELECT orders WHERE id AND user_id AND status IN ('pending_payment','confirmed')
    Ctrl->>DB: UPDATE orders SET status='cancelled'
    DB-->>User: 更新后的订单
```

## 11. 预设数据流

```mermaid
graph TB
    subgraph Public["公开访问（无需认证）"]
        GetAll["GET /api/presets<br/>合并获取全部预设"]
        GetFacilities["GET /api/presets/facilities"]
        GetRoomTypes["GET /api/presets/room-types"]
        GetPromoTypes["GET /api/presets/promotion-types"]
        GetHotCities["GET /api/presets/cities/hot"]
        GetAllCities["GET /api/presets/cities"]
    end

    subgraph Admin["管理员操作（需认证 + admin）"]
        AddFacility["POST /api/admin/presets/facilities"]
        AddRoomType["POST /api/admin/presets/room-types"]
        AddPromoType["POST /api/admin/presets/promotion-types"]
        AddCity["POST /api/admin/presets/cities"]
    end

    subgraph PresetService["presetService"]
        PromiseAll["getAllPresets()<br/>Promise.all 并发查询"]
    end

    subgraph DB["PostgreSQL 预设表"]
        PF["preset_facilities"]
        PRT["preset_room_types"]
        PPT["preset_promotion_types"]
        PC["preset_cities"]
    end

    GetAll --> PromiseAll
    PromiseAll --> PF
    PromiseAll --> PRT
    PromiseAll --> PPT
    PromiseAll --> PC

    AddFacility --> PF
    AddRoomType --> PRT
    AddPromoType --> PPT
    AddCity --> PC
```

## 12. 图片代理数据流

```mermaid
graph LR
    Client["客户端"] -->|"GET /api/image?url=...&w=400&h=300&q=80&fmt=webp"| ImageCtrl["imageController"]
    ImageCtrl -->|"fetch(url)<br/>跟随重定向 ≤3 次"| Remote["远程图片服务器"]
    Remote -->|"原始图片 Buffer"| Sharp["Sharp 处理<br/>① resize(w, h, fit:inside)<br/>② toFormat(fmt, quality)<br/>③ 1年 immutable 缓存头"]
    Sharp -->|"处理后图片"| Client
```
