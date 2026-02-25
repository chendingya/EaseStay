# 易宿酒店预订平台（EaseStay）

## 启动方式
- 使用 PowerShell 执行根目录脚本（会自动启动三端并打开页面）：
  - `./start.ps1`
- 或手动：
  - 根目录安装依赖：`npm install`
  - 安装移动端依赖：`npm install --prefix mobile`
  - 安装管理端依赖：`npm install --prefix admin`
  - 安装服务端依赖：`npm install --prefix server`
  - 启动三端：`npm run dev:all`

## 端口说明
- 移动端 H5 地址：`http://localhost:10086/`
- 管理端开发地址：`http://127.0.0.1:4101/`
- 服务端地址：`http://127.0.0.1:4100/`

## Taro H5 说明
- 推荐 Node 版本：>= 16.20.0
- H5 开发使用：`npm run dev:h5`
- H5 生产构建：`npm run build:h5`

## 项目结构
- server：Node.js 后端
- admin：React + Ant Design 管理端
- mobile：Taro + React + Ant Design 移动端（H5）
- docs：需求/架构/详细设计文档

## 数据库与服务
- 数据库：Supabase（PostgreSQL）
- 接口文档：Swagger（/api-docs）

## 文档
- 文档索引见 [docs/README.md](./docs/README.md)

## Docker 部署（三端）
- 已提供：
  - `docker-compose.yml`
  - `server/Dockerfile`
  - `admin/Dockerfile`
  - `mobile/Dockerfile`
  - `docker.env.example`
- 启动前先准备环境变量（可复制 `docker.env.example` 并按实际值填写）：
  - `PUBLIC_API_BASE`：前端构建时注入的后端地址，必须是浏览器可访问地址
  - `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
  - `JWT_SECRET` / `AMAP_KEY`
- 启动：
  - Linux/macOS: `set -a && source docker.env && set +a && docker compose up -d --build`
  - PowerShell: 
    ```powershell
    Get-Content .\docker.env | ForEach-Object {
      if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
      $name, $value = $_ -split '=', 2
      [System.Environment]::SetEnvironmentVariable($name, $value)
    }
    docker compose up -d --build
    ```
- 访问：
  - 服务端：`http://localhost:4100`
  - 管理端：`http://localhost:4101`
  - 移动端 H5：`http://localhost:10086`
