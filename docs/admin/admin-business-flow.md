# Admin 管理端 - 业务流程图文档

> 本文档描述 PC 管理端（admin）核心业务场景的完整流程，涵盖商户操作、管理员操作和系统自动处理三个维度。

## 1. 酒店全生命周期流程

```mermaid
stateDiagram-v2
    [*] --> 新建: 商户创建酒店

    新建 --> 待审核: 提交保存
    待审核 --> 已上架: 管理员审核通过
    待审核 --> 已驳回: 管理员驳回（附原因）
    已驳回 --> 待审核: 商户修改后重新提交
    已上架 --> 已下线: 管理员下线（附原因）
    已下线 --> 已上架: 管理员恢复上架
    已上架 --> 待审核: 商户修改酒店信息

    已上架 --> C端可见: C端展示（仅 approved）

    note right of 待审核: status = pending
    note right of 已上架: status = approved
    note right of 已驳回: status = rejected
    note right of 已下线: status = offline
```

## 2. 商户注册与登录流程

```mermaid
flowchart TD
    Start([用户访问 /login]) --> CheckToken{localStorage<br/>有 token？}
    CheckToken -->|是| AutoRedirect[自动跳转对应首页]
    CheckToken -->|否| ShowLogin[显示登录/注册表单]

    ShowLogin --> TabSelect{选择操作}

    TabSelect -->|登录| InputLogin[输入用户名 + 密码]
    InputLogin --> SubmitLogin[POST /api/auth/login]
    SubmitLogin --> LoginResult{登录结果}
    LoginResult -->|成功| SaveToken["保存 token + userRole + username<br/>到 localStorage"]
    LoginResult -->|失败| ShowError1[显示错误提示]
    ShowError1 --> ShowLogin

    TabSelect -->|注册| InputRegister[输入用户名 + 密码 + 角色]
    InputRegister --> SendSMS[点击发送验证码<br/>POST /api/auth/sms/send]
    SendSMS --> Countdown["60秒倒计时<br/>（演示模式自动回填验证码）"]
    Countdown --> InputCode[输入验证码]
    InputCode --> SubmitRegister[POST /api/auth/register]
    SubmitRegister --> RegResult{注册结果}
    RegResult -->|成功| AutoLogin[自动调用登录接口]
    RegResult -->|失败| ShowError2[显示错误提示]
    AutoLogin --> SaveToken

    SaveToken --> RoleCheck{角色判断}
    RoleCheck -->|merchant| MerchantDash[跳转商户工作台 /]
    RoleCheck -->|admin| AdminDash[跳转管理员工作台 /]

    style SaveToken fill:#e6f7ff,stroke:#1890ff
    style ShowError1 fill:#fff2f0,stroke:#ff4d4f
    style ShowError2 fill:#fff2f0,stroke:#ff4d4f
```

## 3. 商户创建/编辑酒店流程

```mermaid
flowchart TD
    Start([商户进入酒店编辑页]) --> LoadData["并发加载：<br/>① 预设数据（设施/房型/优惠/城市）<br/>② 已审批的自定义申请<br/>③ 酒店数据（编辑模式）"]

    LoadData --> FillForm[填写/修改表单]

    FillForm --> BasicInfo["基本信息<br/>中英文名 / 地址 / 城市 / 星级 / 开业时间"]
    FillForm --> MapSelect["地图选址<br/>城市搜索 → POI 选取 → 自动填充经纬度"]
    FillForm --> SelectFacilities["选择设施<br/>预设标签 + 已审批自定义"]
    FillForm --> ManageRooms["管理房型<br/>预设模板快速添加 / 手动录入<br/>价格 / 库存 / 面积 / 床宽 / WiFi / 早餐"]
    FillForm --> ManagePromo["管理优惠<br/>预设类型选择 / 自定义"]
    FillForm --> UploadImages["上传图片<br/>多图上传 / 预览 / 删除"]
    FillForm --> NearbyInfo["周边信息<br/>景点 / 交通 / 商场（地图搜索）"]

    SelectFacilities --> NeedCustom{需要自定义？}
    NeedCustom -->|否| Continue[继续填写]
    NeedCustom -->|是| SubmitRequest["提交申请<br/>POST /api/requests<br/>type=facility/room_type/promotion"]
    SubmitRequest --> WaitApproval[等待管理员审核]

    ManageRooms --> NeedCustom
    ManagePromo --> NeedCustom

    Continue --> Preview[预览模式<br/>实时计算优惠后价格]
    Preview --> Submit{提交保存}

    Submit -->|新建| CreateAPI["POST /api/merchant/hotels"]
    Submit -->|编辑| UpdateAPI["PUT /api/merchant/hotels/:id"]

    CreateAPI --> StatusPending["状态自动设为 pending"]
    UpdateAPI --> StatusPending

    StatusPending --> WaitAudit[等待管理员审核]
    WaitAudit --> NotifyResult["收到审核结果通知"]

    style StatusPending fill:#fffbe6,stroke:#faad14
    style NotifyResult fill:#e6f7ff,stroke:#1890ff
```

## 4. 管理员酒店审核流程

```mermaid
flowchart TD
    Start([管理员进入审核列表]) --> FilterStatus["筛选状态<br/>默认：待审核"]
    FilterStatus --> LoadList["GET /api/admin/hotels<br/>?status=pending&page&pageSize"]
    LoadList --> SelectHotel[选择酒店进入审核详情]

    SelectHotel --> LoadDetail["并发加载：<br/>① 酒店完整信息<br/>② 该酒店关联的待审请求"]
    LoadDetail --> ReviewInfo["查看审核信息"]

    ReviewInfo --> CheckImages["检查酒店图片"]
    ReviewInfo --> CheckRooms["检查房型信息<br/>价格 / 库存 / 折扣有效期"]
    ReviewInfo --> CheckPromo["检查优惠信息<br/>甘特图时间视图"]
    ReviewInfo --> CheckRequests["查看关联待审请求"]

    CheckImages --> Decision{审核决定}
    CheckRooms --> Decision
    CheckPromo --> Decision
    CheckRequests --> Decision

    Decision -->|通过| Approve["PATCH /api/admin/hotels/:id/status<br/>{status: 'approved'}"]
    Decision -->|驳回| InputReason1["填写驳回原因"]
    Decision -->|下线| InputReason2["填写下线原因"]
    Decision -->|恢复| Restore["PATCH /api/admin/hotels/:id/status<br/>{status: 'restore'}"]

    InputReason1 --> Reject["PATCH /api/admin/hotels/:id/status<br/>{status: 'rejected', rejectReason}"]
    InputReason2 --> Offline["PATCH /api/admin/hotels/:id/status<br/>{status: 'offline', rejectReason}"]

    Approve --> Notify["系统自动通知商户"]
    Reject --> Notify
    Offline --> Notify
    Restore --> Notify

    Notify --> UpdatePending["调用 useAdminPendingStore.refreshPending()<br/>刷新顶部待审数量"]
    UpdatePending --> ReturnList["返回审核列表"]

    style Approve fill:#f6ffed,stroke:#52c41a
    style Reject fill:#fff2f0,stroke:#ff4d4f
    style Offline fill:#fff7e6,stroke:#fa8c16
    style Restore fill:#e6f7ff,stroke:#1890ff
```

## 5. 申请审核流程

```mermaid
flowchart TD
    Start([商户发起申请]) --> SelectType{"申请类型"}

    SelectType -->|自定义设施| FacilityReq["POST /api/requests<br/>type=facility<br/>name: '独立泳池'"]
    SelectType -->|自定义房型| RoomTypeReq["POST /api/requests<br/>type=room_type<br/>name + price + stock"]
    SelectType -->|自定义优惠| PromotionReq["POST /api/requests<br/>type=promotion<br/>name + value + period"]
    SelectType -->|删除酒店| DeleteReq["POST /api/requests<br/>type=hotel_delete<br/>hotelId + name"]

    FacilityReq --> PendingStatus["申请状态：pending"]
    RoomTypeReq --> PendingStatus
    PromotionReq --> PendingStatus
    DeleteReq --> PendingStatus

    PendingStatus --> AdminView([管理员进入申请审核页])

    AdminView --> FilterTab["按类型筛选<br/>全部 / 设施 / 房型 / 优惠 / 删除"]
    FilterTab --> LoadRequests["GET /api/admin/requests<br/>?type&hotelId&page&pageSize"]
    LoadRequests --> ViewDetail["查看申请详情<br/>（弹窗展示）"]

    ViewDetail --> ReviewDecision{审核决定}

    ReviewDecision -->|批准| ApproveReq["PUT /api/admin/requests/:id/review<br/>{action: 'approve'}"]
    ReviewDecision -->|拒绝| InputReason["填写拒绝原因"]
    InputReason --> RejectReq["PUT /api/admin/requests/:id/review<br/>{action: 'reject', rejectReason}"]

    ApproveReq --> PostApprove{"后处理"}
    PostApprove -->|设施/房型/优惠| WritePreset["写入预设数据<br/>可被其他商户复用"]
    PostApprove -->|删除酒店| DoDelete["执行酒店删除"]

    ApproveReq --> SendNotify["发送审批通知给商户"]
    RejectReq --> SendNotify
    SendNotify --> RefreshPending["刷新待审计数"]

    style PendingStatus fill:#fffbe6,stroke:#faad14
    style ApproveReq fill:#f6ffed,stroke:#52c41a
    style RejectReq fill:#fff2f0,stroke:#ff4d4f
```

## 6. 消息通知流程

```mermaid
flowchart TD
    subgraph 触发事件
        E1["酒店审核通过"]
        E2["酒店审核驳回"]
        E3["申请审核通过"]
        E4["申请审核拒绝"]
    end

    subgraph 后端处理
        CreateNotif["notificationService<br/>创建通知记录<br/>INSERT INTO notifications"]
    end

    subgraph 前端展示
        PollUnread["定时/事件驱动<br/>getUnreadCount()"]
        Badge["Header 未读徽标"]
        MsgCenter["消息中心页面"]
    end

    subgraph 用户操作
        ClickNotif["点击通知"]
        MarkAll["全部已读"]
    end

    E1 --> CreateNotif
    E2 --> CreateNotif
    E3 --> CreateNotif
    E4 --> CreateNotif

    CreateNotif --> PollUnread
    PollUnread --> Badge

    Badge -->|点击进入| MsgCenter
    MsgCenter --> ShowList["展示通知列表<br/>支持全部 / 仅未读"]

    ShowList --> ClickNotif
    ClickNotif --> MarkRead["markAsRead(id)<br/>标记单条已读"]
    MarkRead --> UpdateBadge["更新未读数<br/>notifyUnreadUpdate()"]

    ShowList --> MarkAll
    MarkAll --> MarkAllRead["markAsRead()<br/>全部标记已读"]
    MarkAllRead --> UpdateBadge

    UpdateBadge --> Badge

    style CreateNotif fill:#e6f7ff,stroke:#1890ff
    style Badge fill:#fff2f0,stroke:#ff4d4f
```

## 7. 批量操作流程

### 7.1 批量折扣

```mermaid
flowchart TD
    Start([商户进入工作台]) --> ClickBatch["点击'批量折扣'"]
    ClickBatch --> LazyLoad["懒加载全量酒店<br/>翻页合并 ensureHotelsLoaded()"]
    LazyLoad --> ShowModal["打开批量折扣弹窗"]

    ShowModal --> SelectHotel["选择酒店"]
    SelectHotel --> LoadRooms["加载房型列表<br/>GET /api/merchant/hotels/room-type-stats"]
    LoadRooms --> SelectRooms["选择要设置折扣的房型"]
    SelectRooms --> SetDiscount["设置折扣率和数量"]
    SetDiscount --> ConfirmBatch["确认提交<br/>POST /api/merchant/hotels/batch-discount"]

    ConfirmBatch --> Result{结果}
    Result -->|成功| RefreshData["刷新工作台数据"]
    Result -->|失败| ShowError["显示错误信息"]
```

### 7.2 批量房型操作

```mermaid
flowchart TD
    Start([商户进入工作台]) --> ClickBatch["点击'批量房型'"]
    ClickBatch --> LazyLoad["懒加载全量酒店"]
    LazyLoad --> ShowModal["打开批量房型弹窗"]

    ShowModal --> SelectHotel["选择酒店"]
    SelectHotel --> LoadRooms["加载房型统计<br/>显示已用/空闲/下架数量"]
    LoadRooms --> SelectAction{操作类型}

    SelectAction -->|下架房型| SetOfflineCount["设置下架数量"]
    SelectAction -->|调整库存| SetNewStock["设置新库存值"]

    SetOfflineCount --> ConfirmBatch["POST /api/merchant/hotels/batch-room"]
    SetNewStock --> ConfirmBatch
    ConfirmBatch --> RefreshData["刷新工作台数据"]
```

## 8. CSV 导入/导出酒店流程

```mermaid
flowchart TD
    subgraph 导入流程
        ClickImport["点击'导入'按钮"]
        UploadCSV["上传 CSV 文件"]
        ParseCSV["前端解析 parseCSV()"]
        ValidateRows["逐行验证<br/>必填字段 / 星级范围 / 日期格式"]
        ValidResult{验证结果}
        PreviewData["预览导入数据"]
        ConfirmImport["确认导入"]
        BatchCreate["逐条调用<br/>POST /api/merchant/hotels"]
        ImportResult["显示成功/失败条数"]
    end

    subgraph 导出流程
        ClickExport["点击'导出'按钮"]
        FetchAll["全量拉取酒店列表"]
        GenerateCSV["生成 CSV Blob"]
        Download["触发浏览器下载"]
    end

    subgraph 模板
        ClickTemplate["点击'下载模板'"]
        GenTemplate["generateTemplate()"]
        DownloadTpl["下载 CSV 模板"]
    end

    ClickImport --> UploadCSV --> ParseCSV --> ValidateRows --> ValidResult
    ValidResult -->|通过| PreviewData --> ConfirmImport --> BatchCreate --> ImportResult
    ValidResult -->|不通过| ShowErrors["显示验证错误"]

    ClickExport --> FetchAll --> GenerateCSV --> Download
    ClickTemplate --> GenTemplate --> DownloadTpl
```

## 9. 订单统计查看流程

```mermaid
flowchart TD
    Start([进入酒店详情]) --> ClickStats["点击'订单统计'"]
    ClickStats --> Navigate["导航到 /hotels/:id/stats<br/>或 /admin-hotels/:id/stats"]

    Navigate --> ParallelLoad["并发加载"]
    ParallelLoad --> FetchHotel["GET /api/{role}/hotels/:id"]
    ParallelLoad --> FetchStats["GET /api/{role}/hotels/:id/order-stats"]

    FetchHotel --> HotelName["酒店名称展示"]
    FetchStats --> Transform["数据转换"]

    Transform --> StatusPie["statusStats → 饼图<br/>订单状态分布"]
    Transform --> MonthlyBar["monthly → 柱图<br/>月度营收趋势"]
    Transform --> RoomRank["roomTypeSummary → Top8 排序<br/>房型间夜数 & 营收"]
    Transform --> DailyArea["roomTypeDaily → 日期聚合<br/>逐日营收面积图"]

    StatusPie --> LazyCharts["ReactECharts 懒加载渲染"]
    MonthlyBar --> LazyCharts
    RoomRank --> LazyCharts
    DailyArea --> LazyCharts

    style ParallelLoad fill:#e6f7ff,stroke:#1890ff
```

## 10. 商户管理流程（管理员）

```mermaid
flowchart TD
    Start([管理员进入商户管理]) --> SearchMerchant["搜索商户<br/>关键词 + 分页"]
    SearchMerchant --> LoadList["GET /api/user/merchants<br/>?page&pageSize&keyword"]
    LoadList --> MerchantTable["展示商户列表"]

    MerchantTable --> Action{操作选择}

    Action -->|查看详情| ViewDetail["导航 /merchants/:id"]
    ViewDetail --> LoadDetail["GET /api/user/merchants/:id"]
    LoadDetail --> ShowDetail["展示商户信息<br/>+ 名下酒店列表<br/>+ 本地统计（总/上架/审核/下线）"]
    ShowDetail --> ClickHotel["点击酒店"]
    ClickHotel --> GoHotelDetail["导航 /admin-hotels/:id"]

    Action -->|重置密码| OpenResetModal["打开重置密码弹窗"]
    OpenResetModal --> InputNewPwd["输入新密码"]
    InputNewPwd --> ConfirmReset["POST /api/user/merchants/:id/reset-password"]
    ConfirmReset --> ResetResult["显示操作结果"]

    ShowDetail -->|重置密码| OpenResetModal
```

## 11. 账户管理流程

```mermaid
flowchart TD
    Start([进入账户设置页]) --> LoadUser["GET /api/user/me"]
    LoadUser --> ShowInfo["展示用户信息<br/>用户名 / 角色 / 注册时间"]

    ShowInfo --> ClickChangePwd["点击'修改密码'"]
    ClickChangePwd --> OpenModal["打开密码修改弹窗"]
    OpenModal --> InputPwd["输入旧密码 + 新密码 + 确认密码"]

    InputPwd --> Validate{表单验证}
    Validate -->|新密码不一致| ShowValidError["显示验证错误"]
    Validate -->|通过| SubmitChange["POST /api/user/change-password<br/>{oldPassword, newPassword}"]

    SubmitChange --> Result{结果}
    Result -->|成功| ShowSuccess["显示成功提示<br/>关闭弹窗"]
    Result -->|失败| ShowError["显示错误提示<br/>（旧密码错误等）"]
```

## 12. 页面路由守卫流程

```mermaid
flowchart TD
    Start([用户访问任意路由]) --> CheckAuth{"RequireAuth<br/>localStorage 有 token？"}

    CheckAuth -->|否| Redirect1["重定向 /login"]
    CheckAuth -->|是| CheckRole{"RequireRole<br/>角色匹配？"}

    CheckRole -->|不匹配| Redirect2["重定向 /unauthorized"]
    CheckRole -->|匹配| LoadNS["加载路由所需 i18n namespace"]

    LoadNS --> NSReady{namespace 就绪？}
    NSReady -->|否| ShowSkeleton["显示加载骨架"]
    NSReady -->|是| RenderPage["LazyRoute → Suspense → 渲染页面"]

    RenderPage --> PageLoad["React.lazy 加载页面组件"]
    PageLoad --> ShowPage["展示页面内容"]

    style Redirect1 fill:#fff2f0,stroke:#ff4d4f
    style Redirect2 fill:#fff2f0,stroke:#ff4d4f
    style ShowPage fill:#f6ffed,stroke:#52c41a
```

## 13. 管理员待审轮询流程

```mermaid
flowchart TD
    Start([App.jsx 挂载]) --> CheckRole{角色是 admin？}

    CheckRole -->|否| Skip[不执行]
    CheckRole -->|是| InitFetch["首次拉取<br/>refreshPending()"]

    InitFetch --> ParallelReq["并发请求"]
    ParallelReq --> FetchHotels["GET /api/admin/hotels?status=pending"]
    ParallelReq --> FetchRequests["GET /api/admin/requests?status=pending"]

    FetchHotels --> UpdateState["更新 adminPending<br/>{pendingHotels, pendingRequests}"]
    FetchRequests --> UpdateState

    UpdateState --> ShowBadge["侧边栏显示待审数量徽标"]

    ShowBadge --> Timer["setInterval 30秒"]
    Timer --> ParallelReq

    ShowBadge --> TriggerRefresh["AuditDetail / RequestAudit 操作成功后<br/>调用 refreshPending()"]
    TriggerRefresh --> ParallelReq

    style Timer fill:#e6f7ff,stroke:#1890ff
    style TriggerRefresh fill:#fffbe6,stroke:#faad14
```
