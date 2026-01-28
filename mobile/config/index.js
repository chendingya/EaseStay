const config = {
  projectName: 'yisu-mobile',
  date: '2026-01-28',
  designWidth: 750,
  deviceRatio: {
    640: 2.34,
    750: 2,
    828: 1.81
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: ['@tarojs/plugin-platform-h5'],
  defineConstants: {},
  copy: {
    patterns: [],
    options: {}
  },
  framework: 'react',
  compiler: 'webpack5',
  mini: {
    postcss: {
      pxtransform: {
        enable: true,
        config: {}
      },
      url: {
        enable: true,
        config: {
          limit: 1024
        }
      },
      cssModules: {
        enable: false,
        config: {}
      }
    }
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    postcss: {
      pxtransform: {
        enable: true,
        config: {}
      },
      url: {
        enable: true,
        config: {
          limit: 1024
        }
      },
      cssModules: {
        enable: false,
        config: {}
      }
    }
  }
}

module.exports = function () {
  if (process.env.NODE_ENV === 'development') {
    return Object.assign({}, config, require('./dev'))
  }
  return Object.assign({}, config, require('./prod'))
}
