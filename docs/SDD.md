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
| name | String | 酒店名称 |
| address | String | 地址 |
| city | String | 城市 |
| star_rating | Number | 星级 1-5 |
| description | String | 描述 |
| facilities | Array[String] | 设施标签 |
| images | Array[String] | 图片URL |
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
  "address": "示例路 1 号",
  "city": "上海",
  "star_rating": 4,
  "description": "市中心酒店",
  "facilities": ["Wifi", "Parking"],
  "images": ["https://img/1.jpg"],
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
      "city": "上海",
      "star_rating": 4,
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
