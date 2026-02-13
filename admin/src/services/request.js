import axios from 'axios'
import { glassMessage as message } from '../components'

const apiBase = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:4100'

const request = axios.create({
  baseURL: apiBase,
  timeout: 15000
})

const debounceDelay = 300
const debounceMap = new Map()

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (import.meta.env.DEV) {
    config.metadata = { start: performance.now() }
  }
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      const duration = performance.now() - (response.config?.metadata?.start || performance.now())
      const url = response.config?.url || ''
      const method = response.config?.method?.toUpperCase() || 'GET'
      const status = response.status
      console.info(`[perf] ${method} ${url} ${status} ${Math.round(duration)}ms`)
    }
    const data = response?.data
    if (data && data.success === false) {
      message.error(data.message || '请求失败')
      return Promise.reject(new Error(data.message || '请求失败'))
    }
    if (data && data.warning) {
      message.warning(data.warning)
    }
    return response
  },
  (error) => {
    if (import.meta.env.DEV) {
      const duration = performance.now() - (error?.config?.metadata?.start || performance.now())
      const url = error?.config?.url || ''
      const method = error?.config?.method?.toUpperCase() || 'GET'
      const status = error?.response?.status || 'ERR'
      console.info(`[perf] ${method} ${url} ${status} ${Math.round(duration)}ms`)
    }
    const msg = error?.response?.data?.message || error?.message || '请求失败'
    message.error(msg)
    return Promise.reject(error)
  }
)

const safeStringify = (value) => {
  try {
    return JSON.stringify(value)
  } catch {
    return ''
  }
}

const buildDebounceKey = (method, url, data, config) => {
  const params = config?.params
  return [method, url, safeStringify(data), safeStringify(params)].join('|')
}

const debounceRequest = (key, executor) => {
  const existing = debounceMap.get(key)
  if (existing) {
    clearTimeout(existing.timer)
    existing.timer = setTimeout(() => {
      executor()
        .then(existing.resolve)
        .catch(existing.reject)
        .finally(() => debounceMap.delete(key))
    }, debounceDelay)
    return existing.promise
  }
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  const timer = setTimeout(() => {
    executor()
      .then(resolve)
      .catch(reject)
      .finally(() => debounceMap.delete(key))
  }, debounceDelay)
  debounceMap.set(key, { timer, promise, resolve, reject })
  return promise
}

export const api = {
  get: (url, config) => {
    const key = buildDebounceKey('GET', url, null, config)
    return debounceRequest(key, () => request.get(url, config).then((res) => res.data))
  },
  post: (url, data, config) => {
    const key = buildDebounceKey('POST', url, data, config)
    return debounceRequest(key, () => request.post(url, data, config).then((res) => res.data))
  },
  put: (url, data, config) => {
    const key = buildDebounceKey('PUT', url, data, config)
    return debounceRequest(key, () => request.put(url, data, config).then((res) => res.data))
  },
  patch: (url, data, config) => {
    const key = buildDebounceKey('PATCH', url, data, config)
    return debounceRequest(key, () => request.patch(url, data, config).then((res) => res.data))
  },
  delete: (url, config) => {
    const key = buildDebounceKey('DELETE', url, null, config)
    return debounceRequest(key, () => request.delete(url, config).then((res) => res.data))
  }
}

export default request
