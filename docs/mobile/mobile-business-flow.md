# Mobile 移动端 - 业务流程图文档

> 本文档使用 Mermaid 图描述易宿酒店移动端各核心业务流程，覆盖用户旅程、订单生命周期、认证、搜索、收藏、地图、支付等场景。

## 1. 用户核心旅程

```mermaid
graph TB
    Start["打开 App"] --> Restore{"有缓存 token?"}
    Restore -->|是| Verify["静默验证<br/>GET /api/user/me"]
    Verify -->|成功| LoggedIn["已登录状态"]
    Verify -->|失败| Guest["游客状态"]
    Restore -->|否| Guest

    Guest --> Home["首页<br/>搜索 + 热门推荐"]
    LoggedIn --> Home

    Home --> Search["搜索酒店"]
    Home --> HotClick["点击热门酒店"]
    Home --> MapEntry["地图找房"]

    Search --> List["酒店列表<br/>筛选 / 排序 / 分页"]
    List --> DetailNav["点击酒店卡片"]

    HotClick --> Detail["酒店详情"]
    DetailNav --> Detail
    MapEntry --> MapPage["地图页<br/>搜索 + 气泡标记"]
    MapPage --> Detail

    Detail --> RoomDetail["查看房型详情"]
    Detail --> Book["点击预订"]
    RoomDetail --> Book

    Book --> LoginCheck{"已登录?"}
    LoginCheck -->|否| LoginPage["登录页"]
    LoginPage --> Book
    LoginCheck -->|是| CreateOrder["创建订单"]

    CreateOrder --> PayPage["支付页"]
    PayPage --> OrderList["订单列表"]
    OrderList --> OrderDetail2["订单详情"]
    OrderDetail2 -->|确认使用| Finished["已完成"]
    OrderDetail2 -->|取消| Cancelled["已取消"]

    Detail --> Fav["收藏 / 取消收藏"]
    Home --> FavPage["收藏列表"]
    FavPage --> Detail
```

## 2. 订单状态机

```mermaid
stateDiagram-v2
    [*] --> pending_payment: 创建订单<br/>POST /api/hotels/:id/orders

    pending_payment --> confirmed: 支付成功<br/>POST /orders/:id/pay
    pending_payment --> cancelled: 用户取消<br/>POST /orders/:id/cancel

    confirmed --> finished: 确认使用<br/>POST /orders/:id/use
    confirmed --> cancelled: 用户取消<br/>POST /orders/:id/cancel

    finished --> [*]
    cancelled --> [*]

    state pending_payment {
        [*] --> 等待支付
        等待支付: 选择支付方式
        等待支付: 微信 / 支付宝 / 银行卡
    }

    state confirmed {
        [*] --> 待使用
        待使用: 等待入住日期
        待使用: 可取消
    }
```

## 3. 注册流程

```mermaid
flowchart TD
    Start["打开注册页"] --> Input["输入用户名 + 密码 + 确认密码"]
    Input --> SendCode["点击发送验证码"]
    SendCode --> API1["POST /api/auth/sms/send<br/>{username}"]
    API1 -->|成功| Countdown["60s 倒计时"]
    API1 -->|失败| SendCode

    Countdown --> InputCode["输入验证码"]
    InputCode --> Submit["点击注册"]
    Submit --> Validate{"前端校验"}
    Validate -->|密码不一致| Submit
    Validate -->|字段为空| Submit
    Validate -->|通过| Register["POST /api/auth/register<br/>{username, password, code, role:'user'}"]

    Register -->|成功| AutoLogin["自动登录<br/>POST /api/auth/login"]
    Register -->|失败<br/>用户名已存在| Submit

    AutoLogin --> SaveToken["存储 token / userRole<br/>→ Taro Storage"]
    SaveToken --> FetchUser["GET /api/user/me"]
    FetchUser --> UpdateCtx["更新 UserContext<br/>{user, isLogin: true}"]
    UpdateCtx --> Jump["reLaunch<br/>→ /pages/account/index"]
```

## 4. 登录流程

```mermaid
flowchart TD
    Start["打开登录页"] --> ModeSelect{"登录模式"}

    ModeSelect -->|密码登录| PWForm["输入用户名 + 密码"]
    ModeSelect -->|验证码登录| CodeForm["输入手机号 + 验证码"]

    PWForm --> PWSubmit["点击登录"]
    PWSubmit --> PWApi["POST /api/auth/login<br/>{username, password}"]

    CodeForm --> SendCode["点击发送验证码"]
    SendCode --> SMS["POST /api/auth/sms/send"]
    SMS --> Countdown["60s 倒计时"]
    Countdown --> InputCode["输入验证码"]
    InputCode --> CodeSubmit["点击登录"]
    CodeSubmit --> CodeApi["POST /api/auth/phone/login<br/>{username, code}"]

    PWApi & CodeApi -->|成功| SaveToken["存储 token + userRole"]
    PWApi & CodeApi -->|失败| Error["显示错误 Toast"]
    Error --> ModeSelect

    SaveToken --> FetchUser["getCurrentUser()"]
    FetchUser --> UpdateCtx["更新 UserContext"]
    UpdateCtx --> NavCheck{"前一页是<br/>auth 页面?"}
    NavCheck -->|是| RelaunchAccount["reLaunch<br/>→ /pages/account/index"]
    NavCheck -->|否| GoBack["navigateBack<br/>返回前页"]
```

## 5. 搜索与筛选流程

```mermaid
flowchart TD
    subgraph 首页["首页搜索"]
        SelectCity["选择城市<br/>Cascader / GPS 定位"]
        SelectDate["选择日期<br/>Calendar 组件"]
        SetPrice["设置价格区间<br/>Slider"]
        SetStar["选择星级"]
        InputKW["输入关键字"]
        QuickTag["点击快捷标签<br/>来自 presets/facilities"]
        DoSearch["点击搜索"]
    end

    SelectCity & SelectDate & SetPrice & SetStar & InputKW & QuickTag --> DoSearch

    DoSearch --> CacheParams["缓存搜索参数<br/>→ Taro Storage"]
    DoSearch --> NavToList["navigateTo → /pages/list<br/>携带 URL 参数"]

    subgraph 列表页["列表页筛选"]
        ParseURL["解析 URL 参数"]
        SortSwitch["排序切换<br/>推荐 / 价格↑↓ / 星级"]
        StarFilter["星级筛选<br/>Dropdown 多选"]
        TagFilter["标签筛选<br/>Dropdown 多选"]
        FirstLoad["首次加载<br/>api.get /api/hotels"]
    end

    NavToList --> ParseURL
    ParseURL --> FirstLoad
    SortSwitch & StarFilter & TagFilter -->|重新请求| FirstLoad

    FirstLoad -->|有结果| ShowList["显示酒店列表<br/>HotelCard × N"]
    FirstLoad -->|无结果| Empty["空状态"]
    ShowList --> ScrollMore["滚动加载更多<br/>page++"]
    ScrollMore --> FirstLoad

    subgraph 推荐["推荐列表"]
        RecLoad["加载推荐酒店<br/>无筛选参数"]
    end

    ParseURL --> RecLoad
    RecLoad --> RecList["推荐酒店列表"]
```

## 6. 酒店详情与预订流程

```mermaid
flowchart TD
    Enter["进入详情页<br/>URL: id, checkIn, checkOut"] --> Fetch["api.get('/api/hotels/:id<br/>?checkIn=&checkOut=')"]
    Fetch --> Parse["解析酒店数据"]

    Parse --> MergeImg["合并幻灯片<br/>酒店主图 + 房型图<br/>URL 去重"]
    Parse --> CheckFav["查询收藏状态<br/>isFavoriteHotel(id)"]
    Parse --> RenderInfo["渲染酒店信息<br/>名称 / 星级 / 地址 / 设施"]
    Parse --> RenderPromo["渲染促销信息<br/>折扣标签 + 有效期"]
    Parse --> RoomList["渲染房型列表<br/>RoomTypeCard × N"]

    MergeImg --> Hero["Hero 大图区<br/>Swiper + 模糊背景"]

    RoomList --> RoomFilter{"筛选房型?"}
    RoomFilter -->|是| FilterRoom["按 roomTypeId /<br/>间数 / 人数筛选"]
    FilterRoom --> Matched["匹配房型 + 其他房型"]
    RoomFilter -->|否| AllRooms["全部房型"]

    AllRooms & Matched --> ClickBook["点击预订按钮"]
    ClickBook --> AuthCheck{"已登录?"}
    AuthCheck -->|否| ToLogin["→ 登录页"]
    ToLogin --> ClickBook
    AuthCheck -->|是| CreateAPI["POST /api/hotels/:id/orders<br/>{roomTypeId, quantity,<br/>checkIn, checkOut}"]

    CreateAPI -->|成功| ToPay["reLaunch<br/>→ /pages/order-pay?id="]
    CreateAPI -->|库存不足| StockErr["显示错误提示"]

    RoomList --> ClickRoom["点击查看房型"]
    ClickRoom --> ToRoomDetail["→ 房型详情页<br/>hotelId, roomId,<br/>checkIn, checkOut"]
```

## 7. 支付流程

```mermaid
flowchart TD
    Enter["进入支付页<br/>URL: orderId"] --> Fetch["getOrderDetail(id)"]
    Fetch --> Show["显示订单摘要<br/>酒店名 / 房型 / 日期 / 金额"]

    Show --> SelectPay["选择支付方式"]
    SelectPay --> Wechat["微信支付"]
    SelectPay --> Alipay["支付宝"]
    SelectPay --> Bank["银行卡"]

    Wechat & Alipay & Bank --> Confirm["点击确认支付"]
    Confirm --> PayAPI["POST /api/user/orders/:id/pay<br/>{channel}"]
    
    PayAPI -->|成功| Success["支付成功<br/>glassToast.success"]
    PayAPI -->|失败| Fail["支付失败<br/>glassToast.error"]
    
    Fail --> SelectPay
    Success --> Jump["1.5s 后自动跳转<br/>reLaunch → /orders?tab=confirmed"]
```

## 8. 订单管理流程

```mermaid
flowchart TD
    Enter["进入订单列表<br/>useDidShow 刷新"] --> FetchOrders["getMyOrders<br/>({page, pageSize, status})"]

    FetchOrders --> TabBar["Tab 分栏"]
    TabBar --> All["全部"]
    TabBar --> Pending["待付款"]
    TabBar --> Confirmed["待使用"]
    TabBar --> Finished["已完成"]
    TabBar --> Cancelled["已取消"]

    All & Pending & Confirmed & Finished & Cancelled --> Filter{"本地筛选"}
    Filter -->|关键字| KWFilter["keyword 匹配<br/>酒店名 / 订单号"]
    Filter -->|排序| SortFilter["价格排序 / 时间排序"]
    Filter -->|无| DirectShow["直接展示"]

    KWFilter & SortFilter & DirectShow --> RenderList["OrderCard 列表"]

    RenderList --> ClickCard["点击订单卡片"]
    ClickCard --> ToDetail["→ 订单详情页"]

    RenderList --> ClickPay["点击去支付<br/>（待付款订单）"]
    ClickPay --> ToPay["→ 支付页"]

    subgraph 订单详情["订单详情页操作"]
        DetailFetch["getOrderDetail(id)"]
        DetailShow["显示完整信息"]
        
        DetailShow --> ActionCheck{"订单状态?"}
        ActionCheck -->|pending_payment| PayBtn["去支付按钮"]
        ActionCheck -->|confirmed| UseBtn["确认使用<br/>+ 取消按钮"]
        ActionCheck -->|finished / cancelled| NoAction["无操作"]

        PayBtn --> ToPayPage["→ 支付页"]
        UseBtn -->|确认使用| UseAPI["POST /orders/:id/use"]
        UseBtn -->|取消| CancelAPI["POST /orders/:id/cancel"]
        UseAPI --> JumpFinished["reLaunch<br/>→ /orders?tab=finished"]
        CancelAPI --> JumpCancelled["reLaunch<br/>→ /orders?tab=cancelled"]
    end

    subgraph 下拉刷新["下拉刷新"]
        PullDown["下拉手势 > 阈值"]
        PullDown --> Refresh["重新加载第 1 页"]
        Refresh --> MergeData["mergeOrders 去重"]
    end
```

## 9. 收藏管理流程

```mermaid
flowchart TD
    subgraph 详情页操作["酒店详情页"]
        EnterDetail["进入详情页"] --> CheckFav["isFavoriteHotel(id)"]
        CheckFav -->|已收藏| ShowFilled["❤ 实心"]
        CheckFav -->|未收藏| ShowEmpty["♡ 空心"]

        ShowFilled --> ClickHeart["点击收藏按钮"]
        ShowEmpty --> ClickHeart
        ClickHeart --> Toggle["toggleFavoriteHotel(hotel)"]
        Toggle -->|当前已收藏| Remove["DELETE /api/user/favorites/:id"]
        Toggle -->|当前未收藏| Add["POST /api/user/favorites<br/>{hotelId}"]
        Remove --> ShowEmpty
        Add --> ShowFilled
    end

    subgraph 收藏列表["收藏列表页"]
        EnterFav["进入收藏页<br/>useDidShow"] --> LoadFav["getFavoriteHotels()"]
        LoadFav --> SortTime["按 savedAt 降序排列"]
        SortTime --> RenderList["HotelCard 列表<br/>(type='favorite')"]

        RenderList --> SwipeLeft["左滑操作"]
        SwipeLeft --> SwipeDelete["removeFavoriteHotel(id)"]
        SwipeDelete --> Animate["列表动画移除"]

        RenderList --> ClearBtn["清空全部按钮"]
        ClearBtn --> Confirm["二次确认"]
        Confirm --> ClearAPI["clearFavoriteHotels()"]
        ClearAPI --> EmptyState["空状态<br/>去逛逛按钮"]

        RenderList --> ClickCard["点击酒店卡片"]
        ClickCard --> NavDetail["→ 酒店详情页"]
    end
```

## 10. 地图找房流程

```mermaid
flowchart TD
    Enter["进入地图页<br/>city, checkIn, checkOut"] --> InitMap["动态加载高德 SDK<br/>AMap.Map + AMap.Marker"]

    InitMap --> LoadHotels["GET /api/map/hotel-locations<br/>?city=&sort=&stars=<br/>&tags=&minPrice=&maxPrice="]
    LoadHotels --> RenderMarkers["渲染价格气泡标记<br/>buildBubbleEl"]
    RenderMarkers --> FitView["setFitView<br/>自动调整视野"]

    FitView --> UserActions{"用户操作"}

    UserActions --> SearchPOI["搜索 POI"]
    SearchPOI --> Debounce["400ms 防抖"]
    SearchPOI --> CloseDropdown["关闭筛选下拉<br/>互斥逻辑"]
    Debounce --> SearchAPI["GET /api/map/search<br/>?keywords="]
    SearchAPI --> Suggestions["展示搜索建议<br/>遮罩层隔离下层交互"]
    Suggestions --> SelectPOI["选择 POI"]
    SelectPOI --> MoveTo["地图移动到 POI"]
    SelectPOI --> UnlockDist["解锁距离排序选项"]
    SelectPOI --> ReloadHotels["重新加载酒店<br/>以 POI 为中心"]

    UserActions --> ChangeFilter["更改筛选条件<br/>sort / stars / tags / price"]
    ChangeFilter --> CloseSuggestions["关闭搜索建议<br/>互斥逻辑"]
    ChangeFilter --> ReloadHotels
    ChangeFilter --> ScrollReset["底部卡片列表<br/>滚回起点"]
    ReloadHotels --> RenderMarkers

    UserActions --> SortDistance["选择距离排序<br/>需先搜索目的地"]
    SortDistance --> ReloadHotels

    UserActions --> ClearSearch["清除搜索"]
    ClearSearch --> FallbackSort["如当前为距离排序<br/>自动回退到推荐"]
    ClearSearch --> ReloadHotels

    UserActions --> ClickMarker["点击价格气泡"]
    ClickMarker --> Highlight["高亮标记 + 居中"]
    ClickMarker --> ScrollCard["底部卡片滚动到对应位置"]

    UserActions --> ClickCard["点击底部卡片"]
    ClickCard --> Highlight
    ClickCard --> NavDetail["→ 酒店详情页<br/>navigateTo"]
```

## 11. GPS 定位与逆地理编码流程

```mermaid
flowchart TD
    Click["点击定位按钮"] --> GetLocation["Taro.getLocation<br/>{type: 'gcj02'}"]
    GetLocation -->|成功| Coords["获取经纬度<br/>latitude, longitude"]
    GetLocation -->|失败| DefaultCity["使用默认城市"]

    Coords --> Regeocode["GET /api/map/regeocode<br/>?location=lng,lat"]
    Regeocode -->|成功| ParseCity["解析城市名<br/>regeocode.addressComponent.city"]
    Regeocode -->|失败| DefaultCity

    ParseCity --> SetCity["更新 city state"]
    SetCity --> ShowMap["在地图弹窗中<br/>显示定位点"]
    SetCity --> UpdateSearch["更新搜索参数"]

    subgraph 地图弹窗["首页地图弹窗"]
        MapPopup["AMap 实例"]
        Marker["定位标记"]
        ClickMap["点击地图选点"]
        ClickMap --> NewCoords["新坐标"]
        NewCoords --> NewRegeo["逆地理编码"]
        NewRegeo --> UpdateCity["更新城市"]
    end

    ShowMap --> MapPopup
    Coords --> Marker
```

## 12. 页面导航流程

```mermaid
graph TB
    subgraph TabPages["Tab 页面（GlobalBottomNav）"]
        Home["🏠 首页<br/>/pages/index/index"]
        OrdersTab["📋 订单<br/>/pages/orders/index"]
        FavTab["❤ 收藏<br/>/pages/favorites/index"]
        AccountTab["👤 我的<br/>/pages/account/index"]
    end

    subgraph ContentPages["内容页面"]
        ListPage["酒店列表<br/>/pages/list/index"]
        DetailPage["酒店详情<br/>/pages/detail/index"]
        RoomPage["房型详情<br/>/pages/room-detail/index"]
        MapPage2["地图找房<br/>/pages/map/index"]
    end

    subgraph OrderPages["订单页面"]
        OrderDetailPage["订单详情<br/>/pages/order-detail/index"]
        OrderPayPage["支付页<br/>/pages/order-pay/index"]
    end

    subgraph AuthPages["认证页面"]
        LoginPage["登录<br/>/pages/login/index"]
        RegisterPage["注册<br/>/pages/register/index"]
    end

    Home -->|"navigateTo<br/>搜索"| ListPage
    Home -->|"navigateTo<br/>点击酒店"| DetailPage
    Home -->|"navigateTo<br/>地图入口"| MapPage2
    ListPage -->|"navigateTo"| DetailPage
    ListPage -->|"navigateTo"| MapPage2
    MapPage2 -->|"navigateTo"| DetailPage
    DetailPage -->|"navigateTo"| RoomPage
    DetailPage -->|"reLaunch<br/>下单后"| OrderPayPage
    RoomPage -->|"reLaunch<br/>下单后"| OrderPayPage
    OrdersTab -->|"navigateTo"| OrderDetailPage
    OrdersTab -->|"navigateTo"| OrderPayPage
    OrderDetailPage -->|"navigateTo"| OrderPayPage
    OrderPayPage -->|"reLaunch<br/>支付后"| OrdersTab
    OrderDetailPage -->|"reLaunch<br/>操作后"| OrdersTab

    DetailPage -.->|"未登录"| LoginPage
    RoomPage -.->|"未登录"| LoginPage
    AccountTab -.->|"未登录"| LoginPage
    LoginPage <-->|"链接跳转"| RegisterPage
    LoginPage -->|"navigateBack<br/>/ reLaunch"| AccountTab

    TabPages -.->|"reLaunch<br/>Tab 切换"| TabPages

    style MapPage2 fill:#e8f4fd
    style LoginPage fill:#fff3e8
    style RegisterPage fill:#fff3e8
```

## 13. Hero 大图交互流程

```mermaid
flowchart TD
    Enter["进入详情页"] --> LoadHotel["加载酒店数据"]
    LoadHotel --> CollectImages["收集所有图片"]

    CollectImages --> HotelImgs["酒店主图<br/>hotel.images"]
    CollectImages --> RoomImgs["房型图片<br/>room_types[].images<br/>/ image_urls / room_images"]
    HotelImgs & RoomImgs --> Merge["合并 + URL 去重<br/>→ allSlides"]

    Merge --> Swiper["Swiper 轮播"]
    Swiper --> BgBlur["背景毛玻璃层<br/>同源图片 blur"]

    subgraph 下拉交互["下拉展开交互"]
        NormalHeight["正常高度<br/>约 1/3 屏"]
        TouchStart["touchStart<br/>记录起始 Y"]
        TouchMove["touchMove<br/>计算 pullDelta"]
        DeltaCheck{pullDelta > 60px?}
        Expand["展开至 3/4 屏<br/>heroExpanded = true"]
        NoExpand["保持原高度"]
        TouchEnd["touchEnd"]
        Collapse["收回<br/>heroExpanded = false"]
    end

    Swiper --> NormalHeight
    NormalHeight --> TouchStart --> TouchMove --> DeltaCheck
    DeltaCheck -->|是| Expand
    DeltaCheck -->|否| NoExpand
    Expand --> TouchEnd --> Collapse

    subgraph 房型图切换["切换房型图片"]
        SlideChange["滑动到房型图"]
        ShowLabel["显示房型名称<br/>+ 价格标签"]
        BgTransition["背景淡变过渡"]
    end

    Swiper --> SlideChange --> ShowLabel
    SlideChange --> BgTransition
```

## 14. 验证码发送与校验流程

```mermaid
flowchart TD
    Start["输入手机号 / 用户名"]
    Start --> ClickSend["点击发送验证码"]
    ClickSend --> Check{"字段非空?"}
    Check -->|否| Warn["提示输入"]
    Check -->|是| SendAPI["POST /api/auth/sms/send<br/>{username}"]
    SendAPI -->|成功| StartTimer["开始 60s 倒计时<br/>按钮禁用"]
    SendAPI -->|失败| Toast["错误 Toast<br/>（request.js 统一处理）"]

    StartTimer --> Counting["倒计时中<br/>显示剩余秒数"]
    Counting --> TimerEnd{"倒计时结束?"}
    TimerEnd -->|否| Counting
    TimerEnd -->|是| ReEnable["按钮恢复可用<br/>可重新发送"]
    ReEnable --> ClickSend

    subgraph 校验["验证码校验"]
        InputCode["用户输入验证码"]
        SubmitForm["提交表单<br/>登录 / 注册"]
        ServerCheck["服务端校验<br/>smsService.verifyCode"]
        Valid["校验通过"]
        Invalid["校验失败<br/>错误提示"]
    end

    StartTimer --> InputCode --> SubmitForm --> ServerCheck
    ServerCheck -->|通过| Valid
    ServerCheck -->|失败| Invalid --> InputCode
```
