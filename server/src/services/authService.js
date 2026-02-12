const supabase = require('../config/supabase')
const { hashPassword, verifyPassword, signToken } = require('../middleware/auth')
const { verifyCode } = require('./smsService')

const PHONE_REGEX = /^1\d{10}$/

const normalizePhone = (value) => String(value || '').trim()

const isValidPhone = (phone) => PHONE_REGEX.test(phone)

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

const registerByPhone = async ({ phone, code }) => {
  const normalizedPhone = normalizePhone(phone)
  if (!normalizedPhone || !code) {
    return { ok: false, status: 400, message: 'phone、code 为必填项' }
  }
  if (!isValidPhone(normalizedPhone)) {
    return { ok: false, status: 400, message: '手机号格式不正确' }
  }

  const codeCheck = await verifyCode({ phone: normalizedPhone, code })
  if (!codeCheck.ok) {
    return { ok: false, status: 400, message: codeCheck.message }
  }

  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('username', normalizedPhone)
    .single()

  if (existingUser) {
    return { ok: false, status: 409, message: '手机号已注册，请直接登录' }
  }

  const passwordHash = await hashPassword(`phone_${normalizedPhone}_${Date.now()}`)
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      username: normalizedPhone,
      password_hash: passwordHash,
      role: 'user'
    })
    .select('id, username, role')
    .single()

  if (error) {
    return { ok: false, status: 500, message: '注册失败：' + error.message }
  }

  const token = signToken({ id: newUser.id, role: newUser.role })
  return {
    ok: true,
    status: 201,
    data: {
      token,
      userRole: newUser.role,
      isNewUser: true,
      user: newUser
    }
  }
}

const loginByPhone = async ({ phone, code }) => {
  const normalizedPhone = normalizePhone(phone)
  if (!normalizedPhone || !code) {
    return { ok: false, status: 400, message: 'phone、code 为必填项' }
  }
  if (!isValidPhone(normalizedPhone)) {
    return { ok: false, status: 400, message: '手机号格式不正确' }
  }

  const codeCheck = await verifyCode({ phone: normalizedPhone, code })
  if (!codeCheck.ok) {
    return { ok: false, status: 400, message: codeCheck.message }
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, role')
    .eq('username', normalizedPhone)
    .single()

  if (error || !user) {
    return { ok: false, status: 404, message: '手机号未注册，请先注册' }
  }
  if (user.role !== 'user') {
    return { ok: false, status: 403, message: '该账号不可用于移动端登录' }
  }

  const token = signToken({ id: user.id, role: user.role })
  return {
    ok: true,
    status: 200,
    data: {
      token,
      userRole: user.role,
      isNewUser: false,
      user
    }
  }
}

module.exports = {
  register,
  login,
  registerByPhone,
  loginByPhone
}
