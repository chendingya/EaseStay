import { api } from './request'

// 发送验证码
export const sendCode = (username) => {
  return api.post('/api/auth/sms/send', { username })
}

// 账号注册（用户名 + 密码 + 验证码）
export const registerByPassword = (data) => {
  return api.post('/api/auth/register', data)
}

// 用户名密码登录
export const loginByPassword = (data) => {
  return api.post('/api/auth/login', data)
}

// 用户名验证码登录（复用手机验证码登录接口）
export const loginByCode = (data) => {
  return api.post('/api/auth/phone/login', data)
}

// 获取当前用户信息
export const getCurrentUser = () => {
  return api.get('/api/user/me')
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
