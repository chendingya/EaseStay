module.exports = {
  env: {
    NODE_ENV: '"production"'
  },
  h5: {
    /**
     * 生产环境 Webpack 优化
     * - splitChunks: 将 antd-mobile、react 等大库拆成独立 chunk，
     *   浏览器可并行下载 + 长期缓存，减少首屏 JS 体积
     * - minimizer: 开启 Terser 压缩（默认已启用，显式配置以确保生效）
     */
    webpackChain (chain) {
      chain.optimization
        .splitChunks({
          chunks: 'all',
          minSize: 20000,
          cacheGroups: {
            // React 核心库独立 chunk
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              name: 'vendor-react',
              chunks: 'all',
              priority: 40,
              enforce: true
            },
            // antd-mobile 单独打包（最大体积来源）
            antdMobile: {
              test: /[\\/]node_modules[\\/]antd-mobile[\\/]/,
              name: 'vendor-antd',
              chunks: 'all',
              priority: 30,
              enforce: true
            },
            // Taro 运行时
            taro: {
              test: /[\\/]node_modules[\\/]@tarojs[\\/]/,
              name: 'vendor-taro',
              chunks: 'all',
              priority: 20,
              enforce: true
            },
            // 其余第三方依赖
            vendors: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true
            }
          }
        })

      // 移除 console/debugger：仅在 terser minimizer 已存在时才 tap
      // Taro 内部会在 makeConfig 阶段注入 terser，因此用 plugin() 方式更安全
      if (chain.optimization.minimizers.has('terser')) {
        chain.optimization.minimizer('terser').tap((args) => {
          if (args[0] && args[0].terserOptions) {
            args[0].terserOptions.compress = {
              ...(args[0].terserOptions.compress || {}),
              drop_console: true,
              drop_debugger: true,
              pure_funcs: ['console.log', 'console.info', 'console.debug']
            }
          }
          return args
        })
      }

      // 启用 gzip 友好的确定性模块 ID（利于长期缓存）
      // 通过 webpack plugin 方式设置，避免 webpack-chain 版本差异问题
      const webpack = require('webpack')
      chain
        .plugin('deterministic-module-ids')
        .use(webpack.ids.DeterministicModuleIdsPlugin, [{ maxLength: 5 }])
      chain
        .plugin('deterministic-chunk-ids')
        .use(webpack.ids.DeterministicChunkIdsPlugin, [])
    }
  },
  mini: {}
}
