import { api } from './request'

// 发送验证码
export const sendCode = (username) => {
  return api.post('/api/auth/sms/send', { username })
}

// 注册
export const register = (data) => {
  return api.post('/api/auth/register', { ...data, role: 'user' })
}

// 登录
export const login = (data) => {
  return api.post('/api/auth/login', data)
}

// 获取当前用户信息
export const getCurrentUser = () => {
  return api.get('/api/user/me')
}
