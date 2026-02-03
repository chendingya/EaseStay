import Taro from '@tarojs/taro'

const apiBase = (typeof process !== 'undefined' && process.env && process.env.TARO_APP_API_BASE) || 'http://127.0.0.1:4100'

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
    Taro.showToast({ title: msg, icon: 'none' })
    toastShown = true
    throw new Error(msg)
  } catch (error) {
    if (!toastShown) {
      const msg = error?.data?.message || error?.errMsg || error?.message || '请求失败'
      Taro.showToast({ title: msg, icon: 'none' })
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
