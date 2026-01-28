# 易宿酒店预订平台 - 技术架构文档

## 1. 架构风格
- B/S 架构，前后端分离
- 前端：移动端（Taro/React 或 React Native），PC 管理端（React + Ant Design）
- 后端：Node.js（NestJS/Express/Koa），RESTful API
- 数据库：MySQL（或可选 MongoDB）
- 文件服务：图片上传（Banner、实景图），后期可接对象存储

## 2. 逻辑分层
- 前端应用层：MobileApp、PCAdmin
- 服务端路由层：APIGateway
- 业务服务：AuthService、HotelService、SearchService
- 数据存储层：DB、FileStore

## 3. Mermaid 架构示意
```mermaid
graph TD
    User[C端用户] -->|访问| MobileApp[移动端 (Taro/React)]
    Merchant[B端商户] -->|访问| PCAdmin[PC管理后台 (React)]
    Admin[平台管理员] -->|访问| PCAdmin

    subgraph "前端应用层"
        MobileApp
        PCAdmin
    end

    subgraph "Node.js 服务端"
        APIGateway[API 路由层]
        AuthService[认证服务]
        HotelService[酒店信息服务]
        SearchService[搜索与筛选服务]
    end

    subgraph "数据存储层"
        DB[(数据库 MySQL/ Mongo)]
        FileStore[图片存储]
    end

    MobileApp -->|HTTP/REST| APIGateway
    PCAdmin -->|HTTP/REST| APIGateway
    APIGateway --> AuthService
    APIGateway --> HotelService
    APIGateway --> SearchService
    HotelService --> DB
    SearchService --> DB
    HotelService --> FileStore
```

## 4. 非功能性要求
- 安全：JWT 认证、角色鉴权、密码加密存储
- 性能：分页查询、长列表优化、静态资源缓存
- 可观测：健康检查、结构化日志（后续接入）
- 可扩展：服务分层清晰，便于拆分与横向扩展
