import axios from 'axios'
import { glassMessage as message } from '../components'

const apiBase = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:4100'

const request = axios.create({
  baseURL: apiBase,
  timeout: 15000
})

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  (response) => {
    const data = response?.data
    if (data && data.success === false) {
      message.error(data.message || '请求失败')
      return Promise.reject(new Error(data.message || '请求失败'))
    }
    return response
  },
  (error) => {
    const msg = error?.response?.data?.message || error?.message || '请求失败'
    message.error(msg)
    return Promise.reject(error)
  }
)

export const api = {
  get: (url, config) => request.get(url, config).then((res) => res.data),
  post: (url, data, config) => request.post(url, data, config).then((res) => res.data),
  put: (url, data, config) => request.put(url, data, config).then((res) => res.data),
  patch: (url, data, config) => request.patch(url, data, config).then((res) => res.data),
  delete: (url, config) => request.delete(url, config).then((res) => res.data)
}

export default request
