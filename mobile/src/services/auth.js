import { api } from './request'
import { userStore } from './userStore'

// 发送验证码
export const sendCode = (phone) => {
  return api.post('/api/auth/sms/send', { phone })
}

// 手机号验证码注册（模拟）
export const register = (data) => {
  return api.post('/api/auth/phone/register', data)
}

// 手机号验证码登录（模拟）
export const login = (data) => {
  return api.post('/api/auth/phone/login', data)
}

// 获取当前用户信息，并同步写入本地缓存
export const getCurrentUser = async () => {
  const res = await api.get('/api/user/me')
  if (res && res.id) {
    userStore.set(res)
  }
  return res
}

// 获取当前用户订单
export const getMyOrders = (params = {}) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, value)
    }
  })
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return api.get(`/api/user/orders${suffix}`)
}

// 获取订单详情
export const getOrderDetail = (orderId) => {
  return api.get(`/api/user/orders/${orderId}`)
}

// 订单支付（模拟）
export const payOrder = (orderId, data = {}) => {
  return api.post(`/api/user/orders/${orderId}/pay`, data)
}

export const cancelOrder = (orderId) => {
  return api.post(`/api/user/orders/${orderId}/cancel`)
}

export const useOrder = (orderId) => {
  return api.post(`/api/user/orders/${orderId}/use`)
}
