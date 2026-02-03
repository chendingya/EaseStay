# 易宿酒店预订平台 - 详细设计文档（SDD）

## 1. 技术栈与工程规范
- 前端：React（PC），Taro/React（移动端）
- 后端：Node.js（Express/Koa/NestJS）
- API：RESTful，JSON 传输
- 安全：JWT 认证、角色鉴权

## 2. 数据模型设计
### 2.1 User
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Number | 主键 |
| username | String | 用户名 |
| password_hash | String | 密码哈希 |
| role | Enum('merchant','admin') | 角色 |
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
| created_at | Date | 创建时间 |

### 2.4 Request（申请审核）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Number | 主键 |
| merchant_id | Number | 商户用户ID |
| hotel_id | Number | 关联酒店ID（可空） |
| type | Enum('facility','room_type','promotion') | 申请类型 |
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

### 4.2 认证模块
#### POST /api/auth/register
请求：
```json
{
  "username": "merchant001",
  "password": "123456",
  "role": "merchant"
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

### 4.3 商户酒店管理（PC 端 - 商户）
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
    { "name": "豪华大床房", "price": 399, "stock": 10 }
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

### 4.4 管理员酒店管理（PC 端 - 管理员）
#### GET /api/admin/hotels
Query：status（可选）
响应：酒店列表

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
  "totalRevenue": 50000,
  "statusDistribution": [...],
  "monthlyRevenue": [...]
}
```

### 4.5 酒店查询（移动端）
#### GET /api/hotels
Query：
city, keyword, checkIn, checkOut, sort, page, pageSize

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

## 5. 前后端接口对齐清单
- 认证：登录返回 userRole，用于前端自动跳转
- 商户端：酒店创建/更新后状态统一为 pending
- 管理端：审核支持 approve/reject/offline/restore
- 移动端：列表仅展示 approved 酒店，详情房型价格升序

## 6. 申请审核模块 API
### 6.1 商户提交申请
#### POST /api/requests
请求：
```json
{
  "hotelId": 1,
  "type": "facility",
  "name": "私人泳池",
  "data": {}
}
```
响应：
```json
{
  "id": 1,
  "merchant_id": 2,
  "type": "facility",
  "name": "私人泳池",
  "status": "pending"
}
```

### 6.2 商户获取申请列表
#### GET /api/requests
Query：status、type（可选）
响应：申请列表

### 6.3 管理员获取待审核申请
#### GET /api/admin/requests
Query：type（可选）
响应：待审核申请列表（含商户和酒店信息）

### 6.4 管理员审核申请
#### PUT /api/admin/requests/:id/review
请求：
```json
{
  "action": "approve"
}
```
或
```json
{
  "action": "reject",
  "rejectReason": "不符合规范"
}
```
响应：{ "message": "已批准" } 或 { "message": "已拒绝" }

## 7. 通知消息模块 API
### 7.1 获取用户通知
#### GET /api/requests/notifications
Query：unreadOnly（可选，true/false）
响应：通知列表

### 7.2 标记通知已读
#### PUT /api/requests/notifications/:id/read
响应：{ "message": "已标记为已读" }

### 7.3 标记所有通知已读
#### PUT /api/requests/notifications/read-all
响应：{ "message": "已全部标记为已读" }

## 8. 预设数据配置
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

## 9. PC 管理端模块实现（admin）
### 9.1 路由与权限入口
- App.jsx 统一路由与面包屑配置，按角色渲染菜单
- 登录态缺失自动跳转登录页，商户角色限制管理员路由访问

### 9.2 工作台（Dashboard）
- 统一拉取酒店列表并统计待审核/已上架/已下线
- 提供批量折扣与批量房型操作入口

### 9.3 商户酒店管理
- Hotels：搜索筛选、状态标签、批量导入
- HotelEdit：地图选址、图片上传、设施/房型/优惠编辑与申请提交
- HotelDetail：商户侧酒店详情与房型/设施信息展示

### 9.4 管理员酒店管理
- AdminHotels：全量酒店管理列表与统计卡片
- AdminHotelDetail：管理员侧酒店详情与上下架/审核动作入口
- Audit / AuditDetail：审核列表与酒店审核详情，支持通过/驳回/下线/恢复

### 9.5 申请审核
- RequestAudit：按类型/酒店过滤待审申请，支持通过/拒绝与原因记录

### 9.6 消息中心
- Messages：消息列表、未读筛选、标记已读/全部已读

### 9.7 账户与商户管理
- Account：账户信息与修改密码
- Merchants / MerchantDetail：商户列表、详情、重置密码与酒店统计

## 10. 服务端模块实现（server）
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
- mapController 提供 POI 搜索、地理编码与逆地理编码

### 10.7 状态与健康检查
- statusController 输出状态页与健康检查接口
