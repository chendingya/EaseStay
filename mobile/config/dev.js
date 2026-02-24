module.exports = {
  env: {
    NODE_ENV: '"development"'
  },
  h5: {
    devServer: {
      host: '0.0.0.0',
      port: 10086,
      // 将 /api 和 /health 请求代理到本机后端
      // 手机只需访问 10086 端口，无需穿透防火墙到 4100
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:4100',
          changeOrigin: true
        },
        '/health': {
          target: 'http://127.0.0.1:4100',
          changeOrigin: true
        }
      }
    }
  },
  mini: {}
}
