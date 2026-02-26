# 易宿酒店预订平台 Docker 部署指南

## 1. 适用范围
- 适用于当前仓库三端部署：
  - `server`：Node.js + Express（4100）
  - `admin`：React + Vite（4101）
  - `mobile`：Taro H5（10086）
- 通过同一个 `docker-compose.yml` 统一编排部署。

## 2. 已落地部署文件
- 根目录：
  - `docker-compose.yml`
  - `.dockerignore`
  - `docker.env`
  - `docker.env.example`
- 子项目：
  - `server/Dockerfile`
  - `admin/Dockerfile`
  - `admin/nginx.conf`
  - `mobile/Dockerfile`
  - `mobile/nginx.conf`

## 3. 前置条件
- 已安装 Docker（建议 Docker Desktop / Docker Engine 24+）。
- 本机端口未占用：`4100`、`4101`、`10086`。

## 4. 环境变量配置

### 4.1 推荐做法
1. 以模板为基准维护：
```bash
cp docker.env.example docker.env
```
2. 编辑 `docker.env`，填入真实值。

### 4.2 关键变量说明
- `PUBLIC_API_BASE`：
  - 前端构建时注入的后端地址（`admin` 的 `VITE_API_BASE`，`mobile` 的 `TARO_APP_API_BASE`）。
  - 必须是“浏览器可访问到”的地址。
  - 例如公网部署：`http://<你的服务器IP>:4100` 或 `https://api.xxx.com`。
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`：
  - `server` 启动必须项。
- `JWT_SECRET`：
  - 服务端 JWT 签名密钥。
- `AMAP_KEY`：
  - 地图服务能力使用。

### 4.3 图片代理白名单（`/api/image`）
- `IMAGE_PROXY_ALLOW_ALL=true`：
  - 允许代理所有图片域名，`IMAGE_PROXY_ALLOW_HOSTS` 可留空。
- `IMAGE_PROXY_ALLOW_ALL=false`：
  - 启用白名单，仅允许 `IMAGE_PROXY_ALLOW_HOSTS` 中的主机名。
  - 示例：
```env
IMAGE_PROXY_ALLOW_ALL=false
IMAGE_PROXY_ALLOW_HOSTS=abcxyz.supabase.co,images.unsplash.com,cdn.example.com
```
- 说明：
  - `IMAGE_PROXY_ALLOW_HOSTS` 填“主机名”，不要写 `http://` 或路径。
  - 代码会自动把 `SUPABASE_URL` 的 host 加入允许列表。

## 5. 首次部署

### 5.1 预检查
```bash
docker compose --env-file docker.env config
```

### 5.2 构建并启动
```bash
docker compose --env-file docker.env up -d --build
```

### 5.3 状态检查
```bash
docker compose ps
docker compose logs -f server
```

## 6. 访问地址
- 服务端：`http://localhost:4100`
- 管理端：`http://localhost:4101`
- 移动端 H5：`http://localhost:10086`
- 健康检查：`http://localhost:4100/health`
- Swagger：`http://localhost:4100/api-docs`

## 7. 日常运维命令
- 查看全部日志：
```bash
docker compose logs -f
```
- 查看单服务日志：
```bash
docker compose logs -f server
docker compose logs -f admin
docker compose logs -f mobile
```
- 重启单服务：
```bash
docker compose restart server
```
- 仅重建某个服务：
```bash
docker compose --env-file docker.env up -d --build server
```
- 停止并移除容器：
```bash
docker compose down
```

## 8. 更新发布流程（推荐）
1. 拉取最新代码。
2. 如变量有变化，更新 `docker.env`。
3. 执行：
```bash
docker compose --env-file docker.env up -d --build
```
4. 用 `docker compose ps` 和 `server` 日志确认启动成功。

## 9. 常见问题排查
- 前端页面能打开但接口报错：
  - 检查 `PUBLIC_API_BASE` 是否可被浏览器访问。
- `server` 启动即退出：
  - 检查 `SUPABASE_URL` / `SUPABASE_ANON_KEY` 是否为空。
- 图片接口返回 `host not allowed`：
  - `IMAGE_PROXY_ALLOW_ALL=false` 时，补充对应域名到 `IMAGE_PROXY_ALLOW_HOSTS`。
- 端口冲突：
  - 修改 `docker-compose.yml` 左侧映射端口（如 `4101:80` 中前者）。

## 10. 安全建议
- 不要提交含真实密钥的 `docker.env` 到仓库。
- 生产环境建议：
  - 使用高强度 `JWT_SECRET`；
  - 将 `IMAGE_PROXY_ALLOW_ALL` 设为 `false` 并维护白名单；
  - 给 `4100` 做网关或防火墙限制，仅对前端/可信来源开放。
