const supabase = require('../config/supabase')
const { hashPassword, verifyPassword, signToken } = require('../middleware/auth')
const { verifyCode } = require('./smsService')

const PHONE_REGEX = /^1\d{10}$/

const normalizePhone = (value) => String(value || '').trim()
const normalizeUsername = (value) => String(value || '').trim()
const resolveAuthIdentifier = ({ phone, username }) => {
  const normalizedPhone = normalizePhone(phone)
  const normalizedUsername = normalizeUsername(username)
  return {
    normalizedPhone,
    targetUsername: normalizedPhone || normalizedUsername
  }
}

const isValidPhone = (phone) => PHONE_REGEX.test(phone)

const register = async ({ phone, username, password, role, code }) => {
  const { normalizedPhone, targetUsername } = resolveAuthIdentifier({ phone, username })
  if (!targetUsername || !password || !role || !code) {
    return { ok: false, status: 400, message: 'phone(或username)、password、role、code 为必填项' }
  }
  if (!['merchant', 'admin', 'user'].includes(role)) {
    return { ok: false, status: 400, message: 'role 必须是 merchant, admin 或 user' }
  }
  if (normalizedPhone && !isValidPhone(normalizedPhone)) {
    return { ok: false, status: 400, message: '手机号格式不正确' }
  }

  // 验证验证码
  const codeCheck = normalizedPhone
    ? await verifyCode({ phone: normalizedPhone, code })
    : await verifyCode({ username: targetUsername, code })
  if (!codeCheck.ok) {
    return { ok: false, status: 400, message: codeCheck.message }
  }

  // 检查用户是否已存在
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('username', targetUsername)
    .single()

  if (existingUser) {
    return { ok: false, status: 409, message: '用户名已存在' }
  }

  // 创建新用户
  const passwordHash = await hashPassword(password)
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      username: targetUsername,
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

const login = async ({ phone, username, password }) => {
  const { normalizedPhone, targetUsername } = resolveAuthIdentifier({ phone, username })
  if (!targetUsername || !password) {
    return { ok: false, status: 400, message: 'phone(或username)、password 为必填项' }
  }
  if (normalizedPhone && !isValidPhone(normalizedPhone)) {
    return { ok: false, status: 400, message: '手机号格式不正确' }
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', targetUsername)
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

const loginByPhone = async ({ phone, username, code }) => {
  const normalizedPhone = normalizePhone(phone)
  const normalizedUsername = normalizeUsername(username)
  const targetUsername = normalizedPhone || normalizedUsername

  if (!targetUsername || !code) {
    return { ok: false, status: 400, message: 'phone、code 为必填项' }
  }
  if (normalizedPhone && !isValidPhone(normalizedPhone)) {
    return { ok: false, status: 400, message: '手机号格式不正确' }
  }

  const codeCheck = normalizedPhone
    ? await verifyCode({ phone: normalizedPhone, code })
    : await verifyCode({ username: normalizedUsername, code })
  if (!codeCheck.ok) {
    return { ok: false, status: 400, message: codeCheck.message }
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, role')
    .eq('username', targetUsername)
    .single()

  if (error || !user) {
    return {
      ok: false,
      status: 404,
      message: normalizedPhone ? '手机号未注册，请先注册' : '用户名未注册，请先注册'
    }
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
