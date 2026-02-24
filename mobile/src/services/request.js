import Taro from '@tarojs/taro'

export const apiBase = (typeof process !== 'undefined' && process.env && process.env.TARO_APP_API_BASE) || 'http://127.0.0.1:4100'

export const resolveImageUrl = (url, options = {}) => {
  if (!url) return ''
  if (process.env.TARO_ENV !== 'h5') return url
  // 如果是相对路径或 data URI，直接返回
  if (!url.startsWith('http')) return url

  const width = Number.isFinite(Number(options.width)) ? Math.round(Number(options.width)) : null
  const height = Number.isFinite(Number(options.height)) ? Math.round(Number(options.height)) : null
  const quality = Number.isFinite(Number(options.quality)) ? Math.round(Number(options.quality)) : null
  const format = options.format || 'webp'
  const params = []
  params.push(`url=${encodeURIComponent(url)}`)
  if (width) params.push(`w=${width}`)
  if (height) params.push(`h=${height}`)
  if (quality) params.push(`q=${quality}`)
  if (format) params.push(`fmt=${format}`)
  return `${apiBase}/api/image?${params.join('&')}`
}

const request = async (options) => {
  const token = Taro.getStorageSync('token')
  const header = {
    ...(options?.header || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
  const url = options?.url?.startsWith('http') ? options.url : `${apiBase}${options.url}`
  let toastShown = false
  try {
    const res = await Taro.request({ ...options, url, header })
    const data = res?.data

    if (data && data.success === false) {
      const msg = data.message || '请求失败'
      Taro.showToast({ title: msg, icon: 'none' })
      toastShown = true
      throw new Error(msg)
    }

    if (res.statusCode >= 200 && res.statusCode < 300) {
      return data
    }

    const msg = data?.message || '请求失败'
    // 只有当不是 200-299 状态码时，才抛出错误并显示 Toast
    if (!toastShown) {
        Taro.showToast({ title: msg, icon: 'none' })
        toastShown = true
    }
    throw new Error(msg)
  } catch (error) {
    if (!toastShown) {
      const msg = error?.data?.message || error?.errMsg || error?.message || '请求失败'
      // 避免重复显示 Toast
      if (!msg.includes('验证码已发送')) {
         Taro.showToast({ title: msg, icon: 'none' })
      }
    }
    throw error instanceof Error ? error : new Error('请求失败')
  }
}

export const api = {
  get: (url, options) => request({ url, method: 'GET', ...(options || {}) }),
  post: (url, data, options) => request({ url, method: 'POST', data, ...(options || {}) }),
  put: (url, data, options) => request({ url, method: 'PUT', data, ...(options || {}) }),
  patch: (url, data, options) => request({ url, method: 'PATCH', data, ...(options || {}) }),
  delete: (url, options) => request({ url, method: 'DELETE', ...(options || {}) })
}

export default request
