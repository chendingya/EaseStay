/**
 * 生产构建预览服务器
 * 复刻 nginx.conf 的行为：静态文件 + /api 代理到后端
 * 用法：npm run preview
 */
const express = require('express')
const { createProxyMiddleware } = require('http-proxy-middleware')
const path = require('path')

const PORT = 5000
const BACKEND = 'http://127.0.0.1:4100'
const DIST = path.join(__dirname, 'dist')

const app = express()

// /api 和 /health 代理到后端（对应 nginx.conf）
// pathFilter 用函数形式，兼容 GET/POST 所有 method
app.use(
  createProxyMiddleware({
    target: BACKEND,
    changeOrigin: true,
    pathFilter: (pathname) =>
      pathname.startsWith('/api') || pathname === '/health'
  })
)

// 静态文件
app.use(express.static(DIST))

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(DIST, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Preview server running at http://localhost:${PORT}`)
  console.log(`API proxying to ${BACKEND}`)
})
