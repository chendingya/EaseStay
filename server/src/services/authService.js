const supabase = require('../config/supabase')
const { hashPassword, verifyPassword, signToken } = require('../middleware/auth')
const { verifyCode } = require('./smsService')

const register = async ({ username, password, role, code }) => {
  if (!username || !password || !role || !code) {
    return { ok: false, status: 400, message: 'username、password、role、code 为必填项' }
  }
  if (!['merchant', 'admin', 'user'].includes(role)) {
    return { ok: false, status: 400, message: 'role 必须是 merchant, admin 或 user' }
  }

  // 验证验证码
  const codeCheck = await verifyCode({ username, code })
  if (!codeCheck.ok) {
    return { ok: false, status: 400, message: codeCheck.message }
  }

  // 检查用户是否已存在
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .single()

  if (existingUser) {
    return { ok: false, status: 409, message: '用户名已存在' }
  }

  // 创建新用户
  const passwordHash = await hashPassword(password)
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      username,
      password_hash: passwordHash,
      role
    })
    .select('id, username, role')
    .single()

  if (error) {
    return { ok: false, status: 500, message: '注册失败：' + error.message }
  }

  return { ok: true, status: 201, data: newUser }
}

const login = async ({ username, password }) => {
  if (!username || !password) {
    return { ok: false, status: 400, message: 'username、password 为必填项' }
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single()

  if (error || !user) {
    return { ok: false, status: 401, message: '账号或密码错误' }
  }

  const match = await verifyPassword(password, user.password_hash)
  if (!match) {
    return { ok: false, status: 401, message: '账号或密码错误' }
  }

  const token = signToken({ id: user.id, role: user.role })
  return { ok: true, status: 200, data: { token, userRole: user.role } }
}

module.exports = {
  register,
  login
}
