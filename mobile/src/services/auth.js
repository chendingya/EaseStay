import { api } from './request'

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
