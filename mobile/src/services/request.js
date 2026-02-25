import Taro from '@tarojs/taro'
import { glassToast } from './glassToast'

// H5 模式下用浏览器当前 origin 作为 API base（自动适配任何 IP/host），
// 配合 webpack dev server proxy（/api → 127.0.0.1:4100）实现手机联调；
// 也可通过 TARO_APP_API_BASE 环境变量覆盖（生产部署时使用）。
export const apiBase = (typeof process !== 'undefined' && process.env && process.env.TARO_APP_API_BASE)
  || (process.env.TARO_ENV === 'h5' && typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:4100')

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

const markToastShown = (error) => {
  if (!error || typeof error !== 'object') return
  try {
    error.__toastShown = true
  } catch (e) {}
}

const createError = (message, toastShown = false) => {
  const err = new Error(message)
  if (toastShown) markToastShown(err)
  return err
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
      glassToast.error(msg)
      toastShown = true
      throw createError(msg, true)
    }

    if (res.statusCode >= 200 && res.statusCode < 300) {
      return data
    }

    const msg = data?.message || '请求失败'
    // 只有当不是 200-299 状态码时，才抛出错误并显示 Toast
    if (!toastShown) {
        glassToast.error(msg)
        toastShown = true
    }
    throw createError(msg, toastShown)
  } catch (error) {
    if (!toastShown) {
      const msg = error?.data?.message || error?.errMsg || error?.message || '请求失败'
      // 避免重复显示 Toast
      if (!msg.includes('验证码已发送')) {
         glassToast.error(msg)
         toastShown = true
      }
    }
    if (error instanceof Error) {
      if (toastShown) markToastShown(error)
      throw error
    }
    throw createError('请求失败', toastShown)
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
