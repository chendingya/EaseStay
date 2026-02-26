# Server 后端 - 业务流程图文档

> 本文档描述后端服务（server）核心业务场景的完整处理流程，包括业务校验、状态流转和异常处理。

## 1. 酒店生命周期状态流转

```mermaid
stateDiagram-v2
    [*] --> pending: 商户 POST /api/merchant/hotels

    pending --> approved: 管理员 PATCH status='approved'
    pending --> rejected: 管理员 PATCH status='rejected'

    approved --> offline: 管理员 PUT offline / 商户 PATCH action='offline'
    approved --> pending: 商户 PUT 修改酒店信息

    rejected --> pending: 商户 PUT 修改后重新提交

    offline --> approved: 管理员 PUT restore / 商户 PATCH action='restore'(仅从approved→offline的可恢复)

    approved --> 待删除: 商户提交 hotel_delete 申请<br/>（酒店自动下线）
    待删除 --> [*]: 管理员审核通过删除<br/>（级联清理订单+房型）
    待删除 --> offline: 管理员拒绝删除<br/>（保持下线状态）

    note right of approved: C端可见<br/>可创建订单
    note right of pending: C端不可见
    note right of rejected: 附 reject_reason
    note right of offline: 附 reject_reason（下线原因）
```

## 2. 订单状态流转

```mermaid

stateDiagram-v2
    [*] --> pending_payment: 创建订单 (POST /api/hotels/{id}/orders)

    pending_payment --> confirmed: 模拟支付成功 (POST /api/user/orders/{id}/pay)
    confirmed --> cancelled: 用户取消 (POST /api/user/orders/{id}/cancel)
    confirmed --> finished: 用户确认使用 (POST /api/user/orders/{id}/use)

    note right of pending_payment: 占用库存\npaid_at = null
    note right of confirmed: 占用库存\npaid_at = NOW()
    note right of finished: 已核销使用\n未到 check_out 仍占库存
    note right of cancelled: 不占用库存

```

## 3. 商户创建酒店完整流程

```mermaid
flowchart TD
    Start([POST /api/merchant/hotels]) --> Auth["authRequired + requireRole('merchant')"]
    Auth --> Validate{参数校验}

    Validate -->|缺少必填字段| Err400["400 缺少酒店名称/地址/城市"]
    Validate -->|通过| NormCity["normalizeCityName(city)<br/>上海→上海市"]

    NormCity --> CheckDup["SELECT hotels<br/>WHERE name=? AND merchant_id=?"]
    CheckDup -->|已存在| Err409["409 该酒店名称已存在"]
    CheckDup -->|不存在| InsertHotel["INSERT hotels<br/>status='pending'"]

    InsertHotel --> HasRooms{有房型数据？}
    HasRooms -->|否| Done
    HasRooms -->|是| ProcessRooms["遍历 roomTypes"]

    ProcessRooms --> CalcDiscount["计算折扣分配<br/>discount_rate / discount_quota"]
    CalcDiscount --> InsertRoom["INSERT room_types"]
    InsertRoom --> MoreRooms{更多房型？}
    MoreRooms -->|是| ProcessRooms
    MoreRooms -->|否| Done["200 返回酒店+房型数据"]

    style Err400 fill:#fff2f0,stroke:#ff4d4f
    style Err409 fill:#fff2f0,stroke:#ff4d4f
    style Done fill:#f6ffed,stroke:#52c41a
```

## 4. 商户编辑酒店流程

```mermaid
flowchart TD
    Start([PUT /api/merchant/hotels/:id]) --> Auth["authRequired + requireRole('merchant')"]
    Auth --> CheckOwner["SELECT hotels WHERE id AND merchant_id"]

    CheckOwner -->|不存在/非本商户| Err404["404 酒店不存在"]
    CheckOwner -->|通过| UpdateHotel["UPDATE hotels SET ... status='pending'<br/>修改后状态重置为待审核"]

    UpdateHotel --> HasRooms{提交了房型数据？}
    HasRooms -->|否| Done

    HasRooms -->|是| ProcessRooms["对比新旧房型"]
    ProcessRooms --> ExistingRoom{已有房型？}

    ExistingRoom -->|有 id| CheckOrders["查询该房型是否有订单引用"]
    CheckOrders -->|有订单| Deactivate["UPDATE room_types<br/>SET is_active=false<br/>（软删除，保留订单关联）"]
    CheckOrders -->|无订单| HardDelete["DELETE room_types<br/>（物理删除）"]

    ExistingRoom -->|无 id（新增）| InsertNew["INSERT room_types"]

    Deactivate --> MoreRooms{更多房型？}
    HardDelete --> MoreRooms
    InsertNew --> MoreRooms
    MoreRooms -->|是| ProcessRooms
    MoreRooms -->|否| Done["200 返回更新后数据"]

    style Err404 fill:#fff2f0,stroke:#ff4d4f
    style Deactivate fill:#fffbe6,stroke:#faad14
```

## 5. 管理员审核酒店流程

```mermaid
flowchart TD
    Start([PATCH /api/admin/hotels/:id/status]) --> Auth["authRequired + requireRole('admin')"]
    Auth --> GetHotel["SELECT hotels WHERE id"]

    GetHotel -->|不存在| Err404["404 酒店不存在"]
    GetHotel -->|存在| CheckAction{status 参数}

    CheckAction -->|approved| DoApprove["UPDATE hotels SET status='approved'<br/>reject_reason=NULL"]
    DoApprove --> NotifyApprove["sendNotification<br/>hotelApproved 模板"]

    CheckAction -->|rejected| CheckReason{有 rejectReason？}
    CheckReason -->|否| ErrReason["400 驳回必须填写原因"]
    CheckReason -->|是| DoReject["UPDATE hotels SET status='rejected'<br/>reject_reason=reason"]
    DoReject --> NotifyReject["sendNotification<br/>hotelRejected 模板"]

    CheckAction -->|offline| DoOffline["UPDATE hotels SET status='offline'<br/>reject_reason=reason"]
    DoOffline --> NotifyOffline["sendNotification<br/>hotelOffline 模板"]

    CheckAction -->|restore| DoRestore["UPDATE hotels SET status='approved'<br/>reject_reason=NULL"]
    DoRestore --> NotifyRestore["sendNotification<br/>hotelRestored 模板"]

    NotifyApprove --> InsertNotif["INSERT notifications"]
    NotifyReject --> InsertNotif
    NotifyOffline --> InsertNotif
    NotifyRestore --> InsertNotif

    InsertNotif --> Response["200 返回更新后酒店"]

    style Err404 fill:#fff2f0,stroke:#ff4d4f
    style ErrReason fill:#fff2f0,stroke:#ff4d4f
    style NotifyApprove fill:#f6ffed,stroke:#52c41a
    style NotifyReject fill:#fff2f0,stroke:#ff4d4f
    style NotifyOffline fill:#fff7e6,stroke:#fa8c16
    style NotifyRestore fill:#e6f7ff,stroke:#1890ff
```

## 6. 申请创建与审核流程

### 6.1 商户提交申请

```mermaid
flowchart TD
    Start([POST /api/requests]) --> Auth["authRequired"]
    Auth --> ValidateType{type 参数}

    ValidateType -->|facility| FacReq["申请新设施<br/>name 必填"]
    ValidateType -->|room_type| RoomReq["申请新房型<br/>name + price + stock 必填"]
    ValidateType -->|promotion| PromoReq["申请新优惠<br/>name + data 必填"]
    ValidateType -->|hotel_delete| DeleteReq["申请删除酒店<br/>hotelId 必填"]

    DeleteReq --> CheckOwner["校验酒店归属商户"]
    CheckOwner -->|非本商户| Err403["403 无权限"]
    CheckOwner -->|通过| AutoOffline["UPDATE hotels SET status='offline'<br/>酒店自动下线"]
    AutoOffline --> InsertReq

    FacReq --> InsertReq["INSERT requests<br/>status='pending'"]
    RoomReq --> InsertReq
    PromoReq --> InsertReq

    InsertReq --> Response["201 返回申请详情"]

    style Err403 fill:#fff2f0,stroke:#ff4d4f
    style AutoOffline fill:#fffbe6,stroke:#faad14
```

### 6.2 管理员审核申请

```mermaid
flowchart TD
    Start([PUT /api/admin/requests/:id/review]) --> Auth["authRequired + requireRole('admin')"]
    Auth --> GetRequest["SELECT requests WHERE id"]

    GetRequest -->|不存在| Err404["404"]
    GetRequest -->|已审核| Err400["400 已审核"]
    GetRequest -->|待审核| CheckAction{action}

    CheckAction -->|approve| SwitchType{申请类型}

    SwitchType -->|facility| AddFacility["UPDATE hotels<br/>SET facilities = facilities || name"]
    SwitchType -->|room_type| AddRoomType["INSERT room_types<br/>{hotel_id, name, price, stock, ...}"]
    SwitchType -->|promotion| AddPromotion["UPDATE hotels<br/>SET promotions = promotions || data"]
    SwitchType -->|hotel_delete| DeleteHotel["DELETE 级联清理"]

    DeleteHotel --> DelOrders["DELETE orders WHERE hotel_id"]
    DelOrders --> DelRooms["DELETE room_types WHERE hotel_id"]
    DelRooms --> DelHotel["DELETE hotels WHERE id"]

    AddFacility --> ApproveReq["UPDATE requests SET status='approved'"]
    AddRoomType --> ApproveReq
    AddPromotion --> ApproveReq
    DelHotel --> ApproveReq

    CheckAction -->|reject| RejectReq["UPDATE requests SET status='rejected'<br/>reject_reason=reason"]

    ApproveReq --> Notify["sendNotification 给商户"]
    RejectReq --> Notify
    Notify --> Response["200 返回审核结果"]

    style Err404 fill:#fff2f0,stroke:#ff4d4f
    style Err400 fill:#fff2f0,stroke:#ff4d4f
    style DeleteHotel fill:#fff2f0,stroke:#ff4d4f
```

## 7. 订单创建完整流程

```mermaid
flowchart TD
    Start([POST /api/hotels/:id/orders]) --> Auth["authRequired"]
    Auth --> ValidateParams{参数校验}

    ValidateParams -->|缺少必填| Err400A["400 缺少房型/日期"]
    ValidateParams -->|checkOut ≤ checkIn| Err400B["400 离店日期必须晚于入住"]
    ValidateParams -->|通过| GetHotel["SELECT hotels WHERE id AND status='approved'"]

    GetHotel -->|不存在/未上架| Err404["404 酒店不存在或未上架"]
    GetHotel -->|存在| GetRoom["SELECT room_types WHERE id AND hotel_id"]

    GetRoom -->|不存在| Err404R["404 房型不存在"]
    GetRoom -->|存在| CheckStock["getActiveOrderQtyMap<br/>查询日期段内占用量"]

    CheckStock --> CalcAvail["available = stock - occupied - offline"]
    CalcAvail --> StockEnough{库存 ≥ quantity？}

    StockEnough -->|否| Err409["409 库存不足"]
    StockEnough -->|是| CalcPrice["calculateRoomPrice<br/>基础价 → 促销 → 折扣"]

    CalcPrice --> CalcTotal["totalPrice = finalPrice × quantity × nights"]
    CalcTotal --> GenOrderNo["生成订单号<br/>YS + timestamp + random"]
    GenOrderNo --> InsertOrder["INSERT orders<br/>status='pending_payment'"]

    InsertOrder --> HasQuota{消耗折扣配额？}
    HasQuota -->|是| UpdateQuota["UPDATE room_types<br/>SET discount_quota -= quantity"]
    HasQuota -->|否| Skip

    UpdateQuota --> Response["201 返回订单详情"]
    Skip --> Response

    style Err400A fill:#fff2f0,stroke:#ff4d4f
    style Err400B fill:#fff2f0,stroke:#ff4d4f
    style Err404 fill:#fff2f0,stroke:#ff4d4f
    style Err404R fill:#fff2f0,stroke:#ff4d4f
    style Err409 fill:#fff2f0,stroke:#ff4d4f
    style Response fill:#f6ffed,stroke:#52c41a
```

## 8. 订单支付与状态变更流程

```mermaid
flowchart TD
    subgraph 支付["模拟支付"]
        PayStart([POST /api/user/orders/:id/pay]) --> CheckPay{订单状态}
        CheckPay -->|非 pending_payment| ErrPay["400 仅待付款订单可支付"]
        CheckPay -->|pending_payment| DoPay["UPDATE orders<br/>SET status='confirmed', paid_at=NOW()"]
        DoPay --> PayDone["200 支付成功"]
    end

    subgraph 使用["确认使用"]
        UseStart([POST /api/user/orders/:id/use]) --> CheckUse{订单状态}
        CheckUse -->|非 confirmed| ErrUse["400 仅已确认订单可使用"]
        CheckUse -->|confirmed| DoUse["UPDATE orders<br/>SET status='finished'"]
        DoUse --> UseDone["200 使用成功"]
    end

    subgraph 取消["取消订单"]
        CancelStart([POST /api/user/orders/:id/cancel]) --> CheckCancel{订单状态}
        CheckCancel -->|已完成/已取消| ErrCancel["400 无法取消"]
        CheckCancel -->|pending_payment/confirmed| DoCancel["UPDATE orders<br/>SET status='cancelled'"]
        DoCancel --> CancelDone["200 取消成功"]
    end

    style ErrPay fill:#fff2f0,stroke:#ff4d4f
    style ErrUse fill:#fff2f0,stroke:#ff4d4f
    style ErrCancel fill:#fff2f0,stroke:#ff4d4f
    style PayDone fill:#f6ffed,stroke:#52c41a
    style UseDone fill:#f6ffed,stroke:#52c41a
    style CancelDone fill:#f6ffed,stroke:#52c41a
```

## 9. 公开酒店智能搜索流程

```mermaid
flowchart TD
    Start([GET /api/hotels]) --> ParseQuery["解析查询参数<br/>city / keyword / sort / tags / stars<br/>minPrice / maxPrice / page / pageSize"]

    ParseQuery --> NormCity["normalizeCityName(city)"]
    NormCity --> HasKeyword{有 keyword？}

    HasKeyword -->|是| Geocode["mapService.geocode(keyword, city)<br/>获取搜索目标坐标"]
    Geocode --> QueryDB["SELECT hotels WHERE status='approved' AND city"]

    HasKeyword -->|否| QueryDB

    QueryDB --> FetchRooms["批量查询关联 room_types"]
    FetchRooms --> CalcPrices["pricingService 批量计算最低价"]

    CalcPrices --> ApplyFilters["应用筛选条件"]
    ApplyFilters --> FilterStars["星级筛选（多选逗号分隔）"]
    ApplyFilters --> FilterTags["标签筛选（命中其一即可）"]
    ApplyFilters --> FilterPrice["价格区间筛选"]
    ApplyFilters --> FilterRooms["房间数量筛选"]
    ApplyFilters --> FilterGuests["可住人数筛选"]

    FilterStars --> Sort{排序策略}
    FilterTags --> Sort
    FilterPrice --> Sort
    FilterRooms --> Sort
    FilterGuests --> Sort

    Sort -->|"keyword 存在"| ScoreSort["综合评分排序<br/>① 文本相关性（名/址/设施匹配度）<br/>② Haversine 距离权重<br/>③ 标签命中数加权"]
    Sort -->|"keyword 不存在"| TagAwareSort["标签感知排序<br/>① 命中标签数 DESC<br/>② 二级：recommend/price/star"]

    ScoreSort --> Paginate["分页截取"]
    TagAwareSort --> Paginate
    Paginate --> Response["{page, pageSize, total, list}"]
```

## 10. 批量折扣操作流程

```mermaid
flowchart TD
    Start([POST /api/merchant/hotels/batch-discount]) --> Auth["authRequired + requireRole('merchant')"]
    Auth --> ValidateBody["校验参数<br/>items: [{roomTypeId, discount, quantity, periods?}]"]

    ValidateBody --> CheckOwnership["filterHotelIdsByMerchant<br/>校验所有房型归属当前商户"]
    CheckOwnership -->|非本商户房型| Err403["403 无权操作他人房型"]
    CheckOwnership -->|通过| Loop["遍历每个操作项"]

    Loop --> SetDiscount["UPDATE room_types SET<br/>discount_rate = discount<br/>discount_quota = quantity<br/>discount_periods = periods"]
    SetDiscount --> More{更多操作项？}
    More -->|是| Loop
    More -->|否| Response["200 批量设置成功"]

    style Err403 fill:#fff2f0,stroke:#ff4d4f
```

## 11. 验证码流程

```mermaid
flowchart TD
    subgraph 发送验证码
        Send([POST /api/auth/sms/send]) --> ValidateUser["校验 username 非空"]
        ValidateUser --> ClearOld["DELETE sms_codes WHERE username"]
        ClearOld --> GenCode["生成 6 位随机数字"]
        GenCode --> SaveCode["INSERT sms_codes<br/>{username, code, expires_at: +5min}"]
        SaveCode --> ReturnCode["返回 {code, expiresAt}<br/>（演示模式直接返回验证码）"]
    end

    subgraph 校验验证码["校验验证码（内部调用）"]
        Verify["verifyCode({username, code})"] --> QueryCode["SELECT sms_codes<br/>WHERE username AND code"]
        QueryCode --> Found{找到记录？}
        Found -->|否| ErrInvalid["验证码不存在"]
        Found -->|是| CheckExpiry{已过期？}
        CheckExpiry -->|是| ErrExpired["验证码已过期"]
        CheckExpiry -->|否| DeleteCode["DELETE sms_codes（用后即删）"]
        DeleteCode --> VerifyOK["校验通过"]
    end

    style ErrInvalid fill:#fff2f0,stroke:#ff4d4f
    style ErrExpired fill:#fff2f0,stroke:#ff4d4f
    style VerifyOK fill:#f6ffed,stroke:#52c41a
```

## 12. 收藏管理流程

```mermaid
flowchart TD
    subgraph 添加收藏
        Add([POST /api/user/favorites]) --> AuthAdd["authRequired"]
        AuthAdd --> CheckDup["SELECT favorite_hotels<br/>WHERE user_id AND hotel_id"]
        CheckDup -->|已收藏| ErrDup["400 已收藏"]
        CheckDup -->|未收藏| InsertFav["INSERT favorite_hotels<br/>UNIQUE(user_id, hotel_id)"]
        InsertFav --> AddDone["200 收藏成功"]
    end

    subgraph 取消收藏
        Remove([DELETE /api/user/favorites/:hotelId]) --> AuthRm["authRequired"]
        AuthRm --> DeleteFav["DELETE favorite_hotels<br/>WHERE user_id AND hotel_id"]
        DeleteFav --> RmDone["200 取消成功"]
    end

    subgraph 清空收藏
        Clear([DELETE /api/user/favorites]) --> AuthClear["authRequired"]
        AuthClear --> DeleteAll["DELETE favorite_hotels<br/>WHERE user_id"]
        DeleteAll --> ClearDone["200 清空成功"]
    end

    subgraph 查询收藏
        List([GET /api/user/favorites]) --> AuthList["authRequired"]
        AuthList --> QueryFavs["SELECT favorite_hotels WHERE user_id"]
        QueryFavs --> GetHotels["SELECT hotels WHERE id IN (...)"]
        GetHotels --> ListDone["200 收藏酒店列表"]
    end
```

## 13. 商户管理流程（管理员）

```mermaid
flowchart TD
    Start([GET /api/user/merchants]) --> Auth["authRequired + requireRole('admin')"]
    Auth --> ParseQuery["解析 page / pageSize / keyword"]

    ParseQuery --> QueryUsers["SELECT users<br/>WHERE role='merchant'<br/>AND username ILIKE keyword"]
    QueryUsers --> GetHotels["SELECT hotels<br/>WHERE merchant_id IN (...)"]
    GetHotels --> CountStats["统计每商户酒店数量"]
    CountStats --> Response["{page, pageSize, total, list}"]

    subgraph 商户详情
        Detail([GET /api/user/merchants/:id]) --> AuthDetail["authRequired + admin"]
        AuthDetail --> GetUser["SELECT users WHERE id AND role='merchant'"]
        GetUser --> GetMerchantHotels["SELECT hotels WHERE merchant_id"]
        GetMerchantHotels --> DetailResponse["商户信息 + 名下酒店列表"]
    end

    subgraph 重置密码
        Reset([POST /api/user/merchants/:id/reset-password]) --> AuthReset["authRequired + admin"]
        AuthReset --> HashPwd["bcrypt.hash(newPassword)"]
        HashPwd --> UpdatePwd["UPDATE users SET password_hash"]
        UpdatePwd --> ResetResponse["200 重置成功"]
    end
```

## 14. 订单统计聚合流程

```mermaid
flowchart TD
    Start([GET /api/{role}/hotels/:id/order-stats]) --> Auth["authRequired"]
    Auth --> QueryOrders["SELECT orders WHERE hotel_id"]
    QueryOrders --> QueryRoomTypes["SELECT room_types WHERE hotel_id"]

    QueryOrders --> Aggregate["多维度聚合"]

    Aggregate --> StatusDist["订单状态分布<br/>按 status GROUP BY"]
    Aggregate --> MonthlyRev["月度收入<br/>按 paid_at 月份 SUM(total_price)"]
    Aggregate --> RoomSummary["房型维度汇总<br/>每房型 间夜数 + 营收"]
    Aggregate --> DailyReport["逐日报表<br/>按 check_in 日期 + 房型"]
    Aggregate --> OccupancyRate["入住率计算"]

    QueryRoomTypes --> RoomSummary
    QueryRoomTypes --> DailyReport

    StatusDist --> Response["{totalOrders, revenue,<br/>statusStats, monthly,<br/>roomTypeSummary, roomTypeDaily}"]
    MonthlyRev --> Response
    RoomSummary --> Response
    DailyReport --> Response
    OccupancyRate --> Response
```
