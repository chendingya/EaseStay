import axios from 'axios'

const apiBase = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:4100'
const defaultErrorMessage = 'Request failed'
let messageModulePromise = null

const request = axios.create({
  baseURL: apiBase,
  timeout: 15000
})

const inflightMap = new Map()

const getMessage = async () => {
  if (!messageModulePromise) {
    messageModulePromise = import('../components/glassMessage').then((mod) => mod.glassMessage)
  }
  return messageModulePromise
}

const showMessage = (type, content) => {
  getMessage()
    .then((message) => {
      const handler = message?.[type]
      if (typeof handler === 'function') handler(content)
    })
    .catch((error) => {
      if (import.meta.env.DEV) {
        console.error('[request] load message module failed', error)
      }
    })
}

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
      showMessage('error', data.message || defaultErrorMessage)
      return Promise.reject(new Error(data.message || defaultErrorMessage))
    }
    if (data && data.warning) {
      showMessage('warning', data.warning)
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
    const msg = error?.response?.data?.message || error?.message || defaultErrorMessage
    showMessage('error', msg)
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

const dedupeInflightRequest = (key, executor) => {
  const existing = inflightMap.get(key)
  if (existing) return existing

  const task = executor().finally(() => {
    inflightMap.delete(key)
  })

  inflightMap.set(key, task)
  return task
}

export const api = {
  get: (url, config) => {
    const key = buildDebounceKey('GET', url, null, config)
    return dedupeInflightRequest(key, () => request.get(url, config).then((res) => res.data))
  },
  post: (url, data, config) => {
    const key = buildDebounceKey('POST', url, data, config)
    return dedupeInflightRequest(key, () => request.post(url, data, config).then((res) => res.data))
  },
  put: (url, data, config) => {
    const key = buildDebounceKey('PUT', url, data, config)
    return dedupeInflightRequest(key, () => request.put(url, data, config).then((res) => res.data))
  },
  patch: (url, data, config) => {
    const key = buildDebounceKey('PATCH', url, data, config)
    return dedupeInflightRequest(key, () => request.patch(url, data, config).then((res) => res.data))
  },
  delete: (url, config) => {
    const key = buildDebounceKey('DELETE', url, null, config)
    return dedupeInflightRequest(key, () => request.delete(url, config).then((res) => res.data))
  }
}

export default request
