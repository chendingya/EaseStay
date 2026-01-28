# 易宿酒店预订平台

## 启动方式
- 使用 PowerShell 执行根目录脚本：
  - `./start.ps1`
- 或手动：
  - 根目录安装依赖：`npm install`
  - 安装移动端依赖：`npm install --prefix mobile`
  - 启动 H5：`npm run dev`
  - 移动端 H5 地址：`http://localhost:10086/`

## 端口说明
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

## 文档
- 文档索引见 [docs/README.md](./docs/README.md)
