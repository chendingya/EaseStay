# 易宿酒店预订平台 - 详细设计文档（SDD）

## 1. 技术栈与工程规范
- 前端：React + Ant Design（PC 管理端），Taro + React + antd-mobile（移动端）
- 后端：Node.js + Express
- API：RESTful，JSON 传输
- 数据库：Supabase（PostgreSQL）
- 文档：Swagger（/api-docs）
- 安全：JWT 认证、角色鉴权、密码加密存储
- 动效与交互：页面转场动画、列表分步入场、下拉刷新临界反馈

### 1.3 国际化与展示一致性约束（2026-02）
- 占位符一致性：词典占位符名必须与 `t()` 调用参数名严格一致。
- 文案语义分层：
  - 标题型 key（表头/按钮/标签）不允许占位符
  - 模板型 key（金额/计数/日期）必须带占位符
- 跨页面一致性：同一业务实体（房型、优惠）在商户详情、管理员详情、审核页保持同构展示。
- 表格多语言韧性：`Actions` 列采用动态宽度估算，并使用横向滚动兜底。
- Admin 长列表性能约束：
  - 列表页默认使用服务端分页与服务端筛选
  - 搜索输入使用防抖，筛选变化后回到第一页
  - 统一复用 `useRemoteTableQuery` 与 `TableFilterBar`
  - 接口保持“旧结构兼容 + 分页结构升级”双模式输出

## 1.2 移动端组件规范
- 透明玻璃按钮 GlassButton：用于预订房型、退出登录、取消订单、确认使用、取消收藏

## 1.1 测试策略与 Mock 说明
### 1.1.1 测试目录约定
- admin：统一放在 admin/tests 下，按层级划分 components、pages、services
- server：统一放在 server/__tests__ 下，按控制器、中间件、路由拆分

### 1.1.2 当前 Mock 的做法
- admin：通过 vitest 的 vi.mock 替换 services 与组件依赖，避免真实网络与 UI 副作用
- server：通过 jest.mock 替换 service 层、supabase 依赖，路由测试用 supertest 发起请求
- 环境变量：测试内注入 SUPABASE_URL 与 SUPABASE_ANON_KEY，避免未配置时报错

### 1.1.3 Mock 的价值与边界
- 价值：隔离外部依赖，聚焦业务逻辑、参数校验与状态流转，执行更快、更稳定
- 边界：不验证真实数据库/外部服务连通性，需要额外集成测试或端到端测试补齐

### 1.1.4 当前覆盖的测试范围
- admin：基础组件渲染、登录页面、申请审核页面、通知服务未读更新
- server：认证接口、预设数据接口、申请接口、地图接口、状态页、控制器与鉴权中间件

### 1.1.5 运行方式
- admin：在 admin 目录执行 npm run test
- server：在 server 目录执行 npm run test

## 2. 数据模型设计
### 2.1 User
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Number | 主键 |
| username | String | 用户名 |
| password_hash | String | 密码哈希 |
| role | Enum('merchant','admin','user') | 角色 |
| created_at | Date | 创建时间 |

### 2.2 Hotel
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Number | 主键 |
| merchant_id | Number | 商户用户ID |
| name | String | 酒店名称（中文） |
| name_en | String | 酒店名称（英文） |
| address | String | 地址 |
| city | String | 城市 |
| lat | Number | 纬度（地图找房定位，商户选址时写入） |
| lng | Number | 经度（地图找房定位，商户选址时写入） |
| star_rating | Number | 星级 1-5 |
| opening_time | Date | 开业时间 |
| description | String | 描述 |
| facilities | Array[String] | 设施标签 |
| images | Array[String] | 图片URL |
| nearby_attractions | Array[String] | 附近景点 |
| nearby_transport | Array[String] | 交通信息 |
| nearby_malls | Array[String] | 商场信息 |
| promotions | Array[Object] | 优惠信息 |
| status | Enum('pending','approved','rejected','offline') | 状态 |
| reject_reason | String | 驳回原因 |
| created_at | Date | 创建时间 |

### 2.3 RoomType
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Number | 主键 |
| hotel_id | Number | 酒店ID |
| name | String | 房型名称 |
| price | Number | 价格 |
| stock | Number | 库存 |
| used_stock | Number | 已用库存 |
| offline_stock | Number | 下架库存 |
| discount_rate | Number | 折扣（正数为折扣率，负数为直减） |
| discount_quota | Number | 折扣配额 |
| discount_periods | Array[Object] | 折扣生效区间（按增量新增） |
| images | Array[String] | 房型图片URL列表 |
| capacity | Number | 可住人数（默认 2） |
| bed_width | Number | 床宽（cm，默认 180） |
| area | Number | 面积（㎡，默认 20） |
| ceiling_height | Number | 层高（m，默认 2.8） |
| wifi | Boolean | 是否提供 WiFi（默认 true） |
| breakfast_included | Boolean | 是否含早餐（默认 false） |
| created_at | Date | 创建时间 |

### 2.4 Request（申请审核）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Number | 主键 |
| merchant_id | Number | 商户用户ID |
| hotel_id | Number | 关联酒店ID（可空） |
| type | Enum('facility','room_type','promotion','hotel_delete') | 申请类型 |
| name | String | 申请名称 |
| data | Object | 附加数据（价格、库存等） |
| status | Enum('pending','approved','rejected') | 状态 |
| reject_reason | String | 驳回原因 |
| created_at | Date | 创建时间 |
| updated_at | Date | 更新时间 |

### 2.5 Notification（消息通知）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Number | 主键 |
| user_id | Number | 用户ID |
| title | String | 通知标题 |
| content | String | 通知内容 |
| type | Enum('info','success','warning','error') | 通知类型 |
| is_read | Boolean | 是否已读 |
| related_id | Number | 关联ID |
| related_type | String | 关联类型 |
| created_at | Date | 创建时间 |
 
### 2.6 Order（订单）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Number | 主键 |
| order_no | String | 订单号（唯一） |
| hotel_id | Number | 酒店ID |
| merchant_id | Number | 商户用户ID |
| user_id | Number | 下单用户ID（必填） |
| room_type_id | Number | 房型ID（必填） |
| room_type_name | String | 房型名称 |
| quantity | Number | 预订数量 |
| price_per_night | Number | 每晚单价 |
| nights | Number | 入住间夜 |
| total_price | Number | 订单总价 |
| status | Enum('pending_payment','confirmed','finished','cancelled') | 订单状态 |
| check_in | Date | 入住日期 |
| check_out | Date | 离店日期 |
| paid_at | Date | 支付时间（可空） |
| created_at | Date | 创建时间 |
| updated_at | Date | 更新时间 |

## 3. 状态流转
- pending：商户新建或更新后进入待审核
- approved：管理员审核通过，可在 C 端展示
- rejected：管理员驳回，需给原因
- offline：管理员下线，可恢复为 approved

## 4. API 设计与前后端对齐
### 4.1 通用约定
- 请求格式：JSON
- 响应格式：JSON
- 认证：Authorization: Bearer <token>
- 分页字段：page、pageSize
 - 订单列表：若缺少 hotel.name 前端将使用 hotel_id 补充展示

### 4.2 认证模块
#### POST /api/auth/sms/send
请求：
```json
{
  "username": "merchant001"
}
```
响应：
```json
{
  "message": "验证码已发送",
  "code": "123456",
  "expiresAt": "2026-02-06T10:00:00.000Z"
}
```

#### POST /api/auth/register
请求：
```json
{
  "username": "merchant001",
  "password": "123456",
  "role": "merchant",
  "code": "123456"
}
```
响应：
```json
{
  "id": 1,
  "username": "merchant001",
  "role": "merchant"
}
```

#### POST /api/auth/login
请求：
```json
{
  "username": "merchant001",
  "password": "123456"
}
```
响应：
```json
{
  "token": "jwt-token",
  "userRole": "merchant"
}
```

#### POST /api/auth/phone/login
请求（移动端验证码登录，支持 username 或 phone）：
```json
{
  "username": "user001",
  "code": "123456"
}
```
或：
```json
{
  "phone": "13800000000",
  "code": "123456"
}
```
响应：
```json
{
  "token": "jwt-token",
  "userRole": "user"
}
```

#### POST /api/auth/phone/register
请求（兼容保留）：
```json
{
  "phone": "13800000000",
  "code": "123456"
}
```
响应：
```json
{
  "token": "jwt-token",
  "userRole": "user"
}
```

### 4.3 商户酒店管理（PC 端 - 商户）
#### GET /api/merchant/hotels
Query：`status`、`keyword`、`city`（可选），`page`、`pageSize`（分页模式可选）
响应：
- 未传 `page/pageSize`：酒店数组（兼容旧调用）
- 传 `page/pageSize`：`{ page, pageSize, total, list }`

#### GET /api/merchant/hotels/cities
响应：商户名下城市列表（去重后的字符串数组）

#### POST /api/merchant/hotels
请求：
```json
{
  "name": "易宿酒店",
  "name_en": "EaseStay Hotel",
  "address": "示例路 1 号",
  "city": "上海",
  "star_rating": 4,
  "opening_time": "2016-05-01",
  "description": "市中心酒店",
  "facilities": ["Wifi", "Parking"],
  "images": ["https://img/1.jpg"],
  "nearby_attractions": ["城市公园", "博物馆"],
  "nearby_transport": ["地铁 2 号线", "机场大巴"],
  "nearby_malls": ["国际广场"],
  "promotions": [
    { "type": "festival", "title": "节日 8 折", "value": 0.8 }
  ],
  "roomTypes": [
    {
      "name": "豪华大床房",
      "price": 399,
      "stock": 10,
      "capacity": 2,
      "bed_width": 180,
      "area": 20,
      "ceiling_height": 2.8,
      "wifi": true,
      "breakfast_included": false
    }
  ]
}
```
响应：
```json
{
  "id": 1,
  "merchant_id": 2,
  "status": "pending",
  "roomTypes": [
    { "id": 1, "hotel_id": 1, "name": "豪华大床房", "price": 399, "stock": 10 }
  ]
}
```

#### PUT /api/merchant/hotels/:id
请求：同创建，可部分字段更新
响应：最新酒店数据与房型列表

#### 详情页展示对齐说明（实现约束）
- `/api/merchant/hotels/:id` 与 `/api/admin/hotels/:id` 返回的 `roomTypes` 使用统一数据结构。
- `roomTypes.images` 为房型图片来源字段；前端兼容读取 `images/image_urls/room_images`。
- 房型优惠展示需包含：
  - 优惠值（折扣/直减）
  - 生效区间（来自 `discount_periods`）
- 酒店级优惠 `promotions` 在详情与审核页均提供甘特时间视图。

#### GET /api/merchant/hotels/overview
响应：商户工作台统计（酒店数量、房间概览、月度收入等）

#### GET /api/merchant/hotels/room-type-stats
Query：hotelIds（以逗号分隔）
响应：房型库存统计列表

#### POST /api/merchant/hotels/batch-discount
请求：选择房型与折扣/数量
响应：批量折扣更新结果

#### POST /api/merchant/hotels/batch-room
请求：批量下架/调整库存
响应：批量更新结果

#### GET /api/merchant/hotels/:id/overview
响应：房间概览（总房间、已用、空闲、下架与占比）

#### GET /api/merchant/hotels/:id/orders
Query：page, pageSize
响应：订单列表（分页）

#### GET /api/merchant/hotels/:id/order-stats
响应：订单统计与房型维度统计

#### PATCH /api/merchant/hotels/:id/status
请求：
```json
{
  "action": "offline"
}
```
响应：状态更新结果

### 4.4 管理员酒店管理（PC 端 - 管理员）
#### GET /api/admin/hotels
Query：`status`、`keyword`、`city`（可选），`page`、`pageSize`（分页模式可选）
响应：
- 未传 `page/pageSize`：酒店数组（兼容旧调用）
- 传 `page/pageSize`：`{ page, pageSize, total, list, stats }`

#### GET /api/admin/hotels/cities
响应：平台酒店城市列表（去重后的字符串数组）

#### PATCH /api/admin/hotels/:id/status
请求：
```json
{
  "status": "approved"
}
```
驳回请求：
```json
{
  "status": "rejected",
  "rejectReason": "图片不清晰"
}
```
响应：更新后的酒店信息

#### PUT /api/admin/hotels/:id/offline
请求：{ "reason": "违规原因" }
响应：状态更新结果

#### PUT /api/admin/hotels/:id/restore
响应：状态更新结果

#### GET /api/admin/hotels/:id/overview
响应：
```json
{
  "totalRooms": 100,
  "usedRooms": 20,
  "freeRooms": 75,
  "offlineRooms": 5,
  "occupancyRate": 20
}
```

#### GET /api/admin/hotels/:id/orders
Query：page, pageSize
响应：订单列表（分页）

#### GET /api/admin/hotels/:id/order-stats
响应：
```json
{
  "totalOrders": 150,
  "revenue": 50000,
  "statusStats": [...],
  "monthly": [...]
}
```

#### GET /api/admin/hotels/room-type-stats
Query：hotelIds（以逗号分隔）
响应：房型库存统计列表

#### POST /api/admin/hotels/batch-discount
请求：选择房型与折扣/数量
响应：批量折扣更新结果

#### POST /api/admin/hotels/batch-room
请求：批量下架/调整库存
响应：批量更新结果

### 4.5 酒店查询（移动端）
#### GET /api/hotels
Query：
city, keyword, sort, tags, stars, minPrice, maxPrice, checkIn, checkOut, userLat, userLng, page, pageSize

响应：
```json
{
  "page": 1,
  "pageSize": 10,
  "total": 100,
  "list": [
    {
      "id": 1,
      "name": "易宿酒店",
      "name_en": "EaseStay Hotel",
      "city": "上海",
      "star_rating": 4,
      "address": "示例路 1 号",
      "opening_time": "2016-05-01",
      "lowestPrice": 399
    }
  ]
}
```

#### 查询与排序逻辑
- 基础过滤：仅返回状态为 approved 的酒店；支持 city、stars（多选逗号分隔）、tags（多选逗号分隔）。
- 价格过滤：传入 minPrice/maxPrice 时，按最低可售价格区间过滤。
- 关键词智能检索：当 keyword 存在时，先基于城市与地理编码定位候选范围，再按名称/地址/设施文本相关性与距离加权评分；分页返回前按评分排序。
- 标签匹配：多选标签满足其一即可展示；命中标签数量越多排序越靠前。
- 排序规则：
  - keyword 存在：按“命中标签数量 → 相关性评分”排序，忽略 sort。
  - keyword 不存在：先按命中标签数量排序，再按 sort 执行二级排序。
  - recommend：星级高到低，其次最低价低到高；price_asc/price_desc 仅按最低价；star 按星级高到低。

#### GET /api/hotels/:id
响应：
```json
{
  "id": 1,
  "name": "易宿酒店",
  "name_en": "EaseStay Hotel",
  "address": "示例路 1 号",
  "city": "上海",
  "star_rating": 4,
  "opening_time": "2016-05-01",
  "nearby_attractions": ["城市公园", "博物馆"],
  "nearby_transport": ["地铁 2 号线", "机场大巴"],
  "nearby_malls": ["国际广场"],
  "promotions": [
    { "type": "festival", "title": "节日 8 折", "value": 0.8 }
  ],
  "roomTypes": [
    { "id": 2, "name": "标准间", "price": 299 },
    { "id": 1, "name": "豪华大床房", "price": 399 }
  ]
}
```

#### POST /api/hotels/:id/orders
认证：`Bearer Token`（必填）

请求：
```json
{
  "roomTypeId": 1,
  "quantity": 1,
  "checkIn": "2026-02-06",
  "checkOut": "2026-02-08"
}
```
响应：
```json
{
  "id": 101,
  "order_no": "YS1739356800123456",
  "hotel_id": 1,
  "merchant_id": 2,
  "user_id": 8,
  "room_type_id": 1,
  "room_type_name": "标准双床房",
  "quantity": 1,
  "price_per_night": 269.1,
  "nights": 2,
  "total_price": 538.2,
  "status": "pending_payment",
  "check_in": "2026-02-20",
  "check_out": "2026-02-22",
  "created_at": "2026-02-12T10:00:00.000Z"
}
```

### 4.6 预设数据（设施/房型/优惠/城市）
#### GET /api/presets
响应：预设数据合集（设施、房型、优惠、热门城市）

#### GET /api/presets/facilities
响应：设施列表

#### GET /api/presets/room-types
响应：房型模板列表

#### GET /api/presets/promotion-types
响应：优惠类型列表

#### GET /api/presets/cities/hot
响应：热门城市列表

#### GET /api/presets/cities
响应：全部城市列表

#### POST /api/admin/presets/facilities
#### POST /api/admin/presets/room-types
#### POST /api/admin/presets/promotion-types
#### POST /api/admin/presets/cities
请求：新增预设数据（管理员）

### 4.7 申请审核模块 API
#### POST /api/requests
请求：商户提交设施/房型/优惠申请
响应：申请详情

#### GET /api/requests
Query：status、type（可选）
响应：申请列表

#### GET /api/admin/requests
Query：`type`、`status`、`hotelId`（可选），`page`、`pageSize`（分页模式可选）
响应：
- 未传 `page/pageSize`：申请数组（含商户和酒店信息）
- 传 `page/pageSize`：`{ page, pageSize, total, list }`

#### PUT /api/admin/requests/:id/review
请求：approve/reject 与驳回原因
响应：审核结果

### 4.8 通知消息模块 API
#### GET /api/notifications
Query：unreadOnly（可选）
响应：通知列表

#### GET /api/notifications/unread-count
响应：未读数量

#### PUT /api/notifications/:id/read
响应：标记已读

#### PUT /api/notifications/read-all
响应：全部已读

### 4.9 地图服务 API

#### GET /api/map/hotel-locations
地图找房核心接口，返回当前城市所有已上架酒店的坐标与最低可售价格（无需鉴权）。

Query：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| city | String | 是 | 城市名（模糊匹配） |
| targetLng | Number | 否 | 目标地点经度，填写后返回 distanceKm |
| targetLat | Number | 否 | 目标地点纬度 |
| sort | String | 否 | 排序：recommend / price_asc / price_desc / star |
| stars | String | 否 | 星级多选，逗号分隔，如 `4,5` |
| tags | String | 否 | 设施标签多选，逗号分隔（URL 编码） |
| minPrice | Number | 否 | 最低价格过滤 |
| maxPrice | Number | 否 | 最高价格过滤 |

响应：
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "易宿酒店",
      "name_en": "EaseStay Hotel",
      "address": "示例路 1 号",
      "lat": 31.2304,
      "lng": 121.4737,
      "star_rating": 4,
      "images": ["https://img/1.jpg"],
      "lowestPrice": 269.1,
      "distanceKm": 1.23
    }
  ]
}
```

说明：
- `lowestPrice` 使用与详情页完全一致的算法：`roomAvailabilityService.getActiveOrderQtyMap` 动态计算已用库存 → `pricingService.calculateRoomPrice` 计算折后价 → 取各房型最小值
- 库存耗尽或无活跃房型的酒店 `lowestPrice` 为 `null`，前端不渲染价格气泡
- `distanceKm` 使用 Haversine 球面距离公式，仅在传入 `targetLng/targetLat` 时返回
- DB 无数据时自动降级为内置 Mock 数据（`server/src/data/mockHotelLocations.js`）

#### GET /api/map/search
Query：keywords、city
响应：高德 POI 列表（最多 10 条），每项含 `name`、`address`、`location`（lng,lat）、`cityname`、`adname`

配置 `AMAP_KEY` 环境变量后对接真实高德接口；未配置时返回模拟占位数据。

#### GET /api/map/geocode
Query：address、city
响应：经纬度（高德 geocode 原始结构）

#### GET /api/map/regeocode
Query：location（格式：`lng,lat`）
响应：地址信息（高德 regeocode 原始结构）

### 4.10 用户与商户管理
#### GET /api/user/me
响应：当前用户信息

#### POST /api/user/change-password
请求：旧密码与新密码
响应：修改结果

#### GET /api/user/orders
Query：page、pageSize、status（可选）

响应：
```json
{
  "page": 1,
  "pageSize": 10,
  "total": 3,
  "list": [
    {
      "id": 101,
      "order_no": "YS1739356800123456",
      "hotel_id": 1,
      "status": "pending_payment",
      "total_price": 538.2,
      "hotel": {
        "id": 1,
        "name": "易宿酒店",
        "name_en": "EaseStay Hotel",
        "city": "上海",
        "address": "示例路 1 号"
      }
    }
  ]
}
```

#### GET /api/user/orders/:id
响应：订单详情（同订单列表结构，含 `hotel` 关联信息）

#### POST /api/user/orders/:id/pay
请求：
```json
{
  "channel": "wechat"
}
```
响应：订单状态更新为 `confirmed`，并写入 `paid_at`

#### POST /api/user/orders/:id/cancel
响应：订单状态更新为 `cancelled`

#### POST /api/user/orders/:id/use
响应：订单状态更新为 `finished`

#### GET /api/user/merchants
Query：`keyword`（可选），`page`、`pageSize`（分页模式可选）
响应：
- 未传 `page/pageSize`：商户数组（兼容旧调用）
- 传 `page/pageSize`：`{ page, pageSize, total, list }`

#### GET /api/user/merchants/:id
响应：商户详情（管理员）

#### POST /api/user/merchants/:id/reset-password
响应：重置结果

## 5. 前后端接口对齐清单
- 认证：注册需要验证码，登录返回 userRole 用于前端自动跳转
- 移动端认证页：登录支持验证码/密码切换；注册字段为用户名、密码、确认密码、验证码
- 验证码交互：发送按钮防抖（发送中锁定）+ 60s 倒计时；开发联调场景支持自动回填模拟验证码
- 登录态同步：登录/注册成功后写入 token + userRole，并同步到 UserContext / userStore
- 商户端：酒店创建/更新后状态统一为 pending
- 管理端：审核支持 approve/reject/offline/restore
- 移动端：列表仅展示 approved 酒店，详情房型价格升序
- 订单：创建订单接口要求登录，状态使用 pending_payment/confirmed/finished/cancelled
- 支付：移动端通过 /api/user/orders/:id/pay 执行模拟支付，成功后订单转为 confirmed
- 收藏：移动端收藏使用本地存储持久化，支持单条取消与批量清空
- 通知中心：使用 /api/notifications 系列接口
- 管理端长列表：统一支持 `page/pageSize + keyword/status/city/...`，并兼容无分页参数的旧数组返回

## 6. 预设数据配置
### 8.1 预设设施标签
```
免费WiFi, 免费停车, 游泳池, 健身房, 餐厅, 会议室,
洗衣服务, 24小时前台, 行李寄存, 接机服务, 商务中心, SPA,
儿童乐园, 宠物友好, 无烟客房, 残疾人设施, 电动车充电, 自助洗衣
```

### 8.2 预设房型模板
| 房型名称 | 默认价格 |
| --- | --- |
| 标准双床房 | 299 |
| 标准大床房 | 329 |
| 豪华大床房 | 399 |
| 豪华双床房 | 429 |
| 商务套房 | 599 |
| 行政套房 | 799 |
| 总统套房 | 1299 |
| 亲子房 | 499 |
| 家庭房 | 569 |

### 8.3 预设优惠类型
| 类型代码 | 显示名称 |
| --- | --- |
| early_bird | 早鸟优惠 |
| weekend | 周末特惠 |
| long_stay | 连住优惠 |
| member | 会员专享 |
| festival | 节日优惠 |
| package | 套餐优惠 |

## 7. PC 管理端模块实现（admin）
### 9.1 路由与权限入口
- App.jsx 统一路由与面包屑配置，按角色渲染菜单
- 登录态缺失自动跳转登录页，商户角色限制管理员路由访问

### 9.2 工作台（Dashboard）
- 统一拉取酒店列表并统计待审核/已上架/已下线
- 提供批量折扣与批量房型操作入口

### 9.3 商户酒店管理
- Hotels：远程分页 + 远程搜索筛选（`status/city/keyword`）、状态标签、批量导入
- HotelEdit：地图选址、图片上传、设施/房型/优惠编辑与申请提交
- HotelDetail：商户侧酒店详情与房型/设施信息展示

### 9.4 管理员酒店管理
- AdminHotels：远程分页 + 远程搜索筛选（`status/city/keyword`）与统计卡片
- AdminHotelDetail：管理员侧酒店详情与上下架/审核动作入口
- Audit / AuditDetail：审核列表（远程分页 + 状态筛选）与酒店审核详情，支持通过/驳回/下线/恢复

### 9.5 申请审核
- RequestAudit：按类型/酒店过滤待审申请，支持远程分页、通过/拒绝与原因记录

### 9.6 消息中心
- Messages：消息列表、未读筛选、标记已读/全部已读

### 9.7 账户与商户管理
- Account：账户信息与修改密码
- Merchants / MerchantDetail：商户列表（远程分页 + 关键词搜索）、详情、重置密码与酒店统计

## 8. 服务端模块实现（server）
### 10.1 入口与路由组织
- app.js 统一挂载 /api、/status、/health 与 Swagger 文档
- routes/index.js 维护鉴权与角色路由聚合

### 10.2 认证与鉴权
- authController/authService 负责登录注册与短信验证码
- middleware/auth.js 统一 JWT 校验与角色鉴权

### 10.3 酒店管理
- merchantHotelsController/adminHotelsController 提供商户与管理员接口
- hotelService 处理酒店状态流转与通知触发

### 10.4 申请审核与通知
- requestController/requestService 处理申请提交、查询与审核
- notificationService 管理消息模板与已读状态

### 10.5 预设数据
- presetController/presetService 提供设施/房型/优惠/城市等预设数据
- /api/presets、/api/admin/presets 分别提供公开与管理端入口

### 10.6 地图服务
- `mapController` 提供 POI 搜索、地理编码、逆地理编码与地图找房（`hotel-locations`）接口
- `mapService.getHotelLocations`：地图找房核心逻辑
  - 从 DB 查询 `approved` 状态酒店（含 `lat`/`lng`/`address`），按城市模糊匹配
  - 调用 `roomAvailabilityService.getActiveOrderQtyMap` + `pricingService.calculateRoomPrice` 计算各酒店最低可售价（与详情页算法完全对齐）
  - 支持星级、设施标签、价格区间过滤与多维度排序（推荐/价格升降/星级/距离）
  - 传入 `targetCoords` 时使用 Haversine 公式计算距目标点距离
  - DB 无结果时降级到 `mockHotelLocations.js` 内置 Mock 数据（覆盖上海/南京/扬州/杭州各 10 家）
- `mapService.geocode` / `regeocode`：地址与坐标互转，内置内存缓存（`geocodeCache: Map`）
- 所有地图服务接口在未配置 `AMAP_KEY` 时返回模拟占位数据，保证开发环境可用
- 循环依赖注意：`hotelService` 顶部引用 `mapService`，故 `mapService` 不能反向引用 `hotelService`；价格计算逻辑已内联实现，直接引用 `pricingService` 与 `roomAvailabilityService`

### 10.7 状态与健康检查
- statusController 输出状态页与健康检查接口

## 11. 移动端模块实现（mobile）
### 11.1 公共导航与页面壳
- `PageTopBar`：统一顶部栏（返回、居中标题、右侧图标操作），用于订单页、支付页、收藏页、登录注册页
- `GlobalBottomNav`：全局底部导航，按当前路由高亮首页/订单/收藏/我的；`HIDDEN_ROUTES`（`/pages/map/index`、`/pages/detail/index`）中的页面不渲染导航组件
- 地图页与详情页均通过 `useEffect` 将 `.app-content` 的 `paddingBottom` 置 `0` 消除全局底部间距，组件卸载时在清理函数中恢复原值
- 详情页 `BookingBottomBar` 对应将 `bottomOffset` 设为 `0`（默认 58 是为底部导航预留的偏移量）

### 11.2 订单页与支付页
- `pages/orders`：顶部栏 + 状态分段 + 订单列表，支持筛选弹层（关键词、金额排序、时间排序）
- `components/OrderList`：统一列表容器（ScrollView + 下拉刷新 + 上拉加载 + 骨架屏 + 分步入场动效），复用于订单/收藏/酒店列表
- `components/OrderCard`：订单卡片（酒店名、房型、入住离店、间夜、订单号、价格；待付款展示“去支付”）
- `pages/order-detail`：订单详情页，待使用订单可取消/确认使用，完成后状态刷新
- `pages/order-pay`：订单详情确认、支付渠道选择、模拟支付后回到订单页“待使用”

### 11.3 收藏页
- `pages/favorites`：顶部栏 + 收藏列表 + 空状态
- `components/OrderList`：收藏列表容器，支持滑动取消收藏
- `components/HotelCard`：酒店图文卡片（中英名、地址、星级/开业、收藏时间、价格）
- 收藏存储：`services/favorites` 基于本地存储，支持单条取消收藏与批量清空

### 11.4 酒店详情与房型详情
- `pages/detail`：房型区改为复用 `createListByType({ type: 'room' })`，统一走列表容器与卡片渲染链路
- `pages/detail` Hero 图片区：原固定高度轮播改为可展开 Hero 区块（默认 280px，顶部下拉超 60px 松手后平滑展开至 75vh，CSS `transition` 过渡）；酒店图片与各房型图片合并为 `allSlides` 统一幻灯片数组（`useMemo` 全局 URL 去重）；切换至房型幻灯片时左下角显示半透明胶囊标签（房型名 + 参考价格）；背景层采用与当前幻灯片同源图片的 `blur(28px)` 模糊版本，所有背景图预渲染并通过 `opacity` + `transition` 淡切，消除切换白屏；`pullDeltaRef` 用 `useRef` 代替 `useState` 存储拖动量，避免 `touchmove` 触发重渲染抖动；所有前景图关闭 `lazyLoad` 预加载
- `components/RoomTypeCard`：房型卡片（图片、标签、基础参数、优惠价/原价、查看详情、预订按钮）
- `components/OrderList`：新增 `room` 类型与嵌入式渲染能力，支持在详情页滚动容器中展示房型列表
- `pages/room-detail`：房型详情页（房型参数、优惠有效期、入住离店展示、直接下单跳转支付）

### 11.5 地图找房页（mobile/src/pages/map）
- 仅支持 H5 环境，动态加载高德地图 SDK（AMap v2.0，插件：Geocoder、PlaceSearch）
- **数据流**：城市/POI/筛选条件任一变化 → 请求 `GET /api/map/hotel-locations` → 更新 `hotels` 状态 → `renderMarkers` 重新绘制气泡 → `setFitView` 适配视野
- **气泡交互**：点击气泡调用 `selectHotel(id)`；`activeId` 变化时 `refreshBubbles` 仅重绘气泡样式，避免重建所有 Marker；激活气泡 `zIndex` 提升至 300，字号放大
- **底部卡片列表**：横向 `overflow-x: auto` 卡片列表，`activeId` 对应卡片自动 `scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })`
- **POI 搜索**：输入框防抖 400ms → 调用 `GET /api/map/search` → 展示建议列表；选择后在地图上添加 POI 图钉标记，并重新拉取酒店数据（传入 `targetLng/targetLat`）；地图提供"回到目的地"按钮
- **筛选**：使用 `antd-mobile Dropdown` 挂载四个区域（排序、星级、标签、价格区间），关闭后触发重新拉取
- **导航栏隐藏**：`useEffect` 将 `.app-content` `paddingBottom` 置 0；`GlobalBottomNav` 的 `HIDDEN_ROUTES` 包含 `/pages/map/index` 使导航组件不渲染
- **路由接入**：页面在 `app.config.js` 的 `pages` 列表中注册为 `pages/map/index`；通过 `Taro.navigateTo` 跳转，携带 `city/checkIn/checkOut` 参数

### 11.6 移动端通知与错误提示
- `components/GlassToast` + `services/glassToast`：新增全局毛玻璃通知通道，默认在页面顶部展示成功/失败/警告/信息提示，支持入场/退场动效与自动消失。
- `app.js`：在应用壳挂载 `GlassToastHost`，保证任意页面可直接调用 `glassToast.success/error/warning/info`。
- `services/request.js`：请求失败统一由请求层提示；异常对象增加 `__toastShown` 标记，防止同一错误在上层页面重复弹出。
- `pages/login`、`pages/register`：捕获异常时先判断 `error.__toastShown`，仅在未提示时补充兜底提示（修复“验证码不存在或已过期”双提示问题）。
- H5 与非 H5 兼容：H5 使用自定义 `GlassToast`；非 H5 环境回退到 `Taro.showToast`，保证端能力兼容。

## 12. 地图找房模块实现约束（2026-02）
- **价格一致性**：`/api/map/hotel-locations` 返回的 `lowestPrice` 与酒店详情页展示价格采用完全相同的计算路径（`getActiveOrderQtyMap` + `computeRoomAvailability` + `calculateRoomPrice`），不使用 `room_types.used_stock` 静态字段
- **循环依赖规避**：`hotelService` 顶部引用了 `mapService`，若 `mapService` 反向引用 `hotelService.getLowestPrices` 会在 Node.js require 阶段产生循环依赖，导致函数为 `undefined`；当前方案为在 `mapService` 内内联相同计算逻辑，直接引用 `pricingService` 与 `roomAvailabilityService`
- **坐标来源**：地图找房优先使用 DB `hotels.lat / hotels.lng` 字段（商户地图选址时写入）；无坐标的酒店在地图上不显示；不再通过高德 geocode 批量转换地址，减少外部 API 调用
- **Mock 降级**：城市查询返回 0 条 DB 结果时，使用 `server/src/data/mockHotelLocations.js` 内置数据（上海/南京/扬州/杭州各 10 家模拟酒店，含完整坐标与模拟房价），供演示使用
- **高德 KEY 配置**：服务端通过 `AMAP_KEY` 环境变量接入高德服务（POI 搜索/geocode/regeocode）；前端地图渲染使用 Web KEY（`mobile/src/pages/map/index.jsx`）；开发环境未配置服务端 KEY 时各地图函数返回模拟占位响应，保证可运行

## 13. Admin 国际化实现细节（2026-02）
### 12.1 目录与资源组织
- 语言目录：`admin/src/locales/zh-CN`、`admin/src/locales/en-US`
- 资源格式：`{namespace}.json`
- 基础 namespace：`common/auth/menu/route/header/role/status/error/brand`
- 业务 namespace：`dashboard/hotels/hotelEdit/hotelDetail/orderStats/messages/account/login`

### 12.2 加载流程
1. `main.jsx` 启动时执行 `initI18n()`。
2. i18n 初始化后仅加载基础 namespace（按当前语言）。
3. 路由切换时，根据 `routeConfig.namespaces` 调用 `loadNamespaces()`。
4. namespace 就绪后再渲染路由页面，防止首帧 key 闪烁。

### 12.3 路由与 namespace 映射策略
- 路由元数据集中在 `admin/src/routes/routeConfig.js`。
- 每条路由可声明 `namespaces: string[]`。
- 映射函数 `getRouteNamespaces(pathname)` 负责动态路由匹配与 namespace 解析。

### 12.4 校验脚本设计
- 脚本：`admin/scripts/i18n-check.js`
- 能力：
  - 自动合并每个语言目录下所有 namespace 文件
  - 扁平化 key 后比对双语一致性
  - 扫描 `src` 非测试文件中的中文硬编码字面量
  - 产出 `i18n-report.json` 与 `i18n-todo.json`

### 12.5 CI 分级门禁
- `npm run i18n:check`：仅 key 一致性，作为 PR 必过项
- `npm run i18n:check:strict`：一致性 + 硬编码扫描，作为主分支保护项

### 12.6 当前落地范围与后续计划
- 已覆盖按需加载的业务域：登录、工作台、酒店管理、酒店编辑、酒店详情、订单统计、消息、账户。
- 待补齐业务域：审核、申请审核、商户管理相关 namespace 独立拆分与路由映射。
