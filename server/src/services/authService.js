const supabase = require('../config/supabase')
const { hashPassword, verifyPassword, signToken } = require('../middleware/auth')
const { verifyCode } = require('./smsService')

const PHONE_REGEX = /^1\d{10}$/

const normalizePhone = (value) => String(value || '').trim()
const normalizeUsername = (value) => String(value || '').trim()
const normalizeCode = (value) => String(value || '').trim()

const isValidPhone = (phone) => PHONE_REGEX.test(phone)

const findUserByUsername = async (username, columns = '*') => {
  const { data, error } = await supabase
    .from('users')
    .select(columns)
    .eq('username', username)
    .maybeSingle()

  if (error) {
    return { ok: false, error }
  }

  return { ok: true, data }
}

const findUserByPhone = async (phone, columns = '*') => {
  const { data, error } = await supabase
    .from('users')
    .select(columns)
    .eq('phone', phone)
    .maybeSingle()

  if (error) {
    return { ok: false, error }
  }

  return { ok: true, data }
}

const register = async ({ username, phone, password, role, code }) => {
  const normalizedUsername = normalizeUsername(username)
  const normalizedPhone = normalizePhone(phone)
  const normalizedCode = normalizeCode(code)

  if (!normalizedUsername || !normalizedPhone || !password || !role || !normalizedCode) {
    return { ok: false, status: 400, message: 'username、phone、password、role、code 为必填项' }
  }
  if (!['merchant', 'admin', 'user'].includes(role)) {
    return { ok: false, status: 400, message: 'role 必须是 merchant, admin 或 user' }
  }
  if (!isValidPhone(normalizedPhone)) {
    return { ok: false, status: 400, message: '手机号格式不正确' }
  }

  const codeCheck = await verifyCode({ phone: normalizedPhone, code: normalizedCode })
  if (!codeCheck.ok) {
    return { ok: false, status: 400, message: codeCheck.message }
  }

  const usernameCheck = await findUserByUsername(normalizedUsername, 'id')
  if (!usernameCheck.ok) {
    return { ok: false, status: 500, message: '注册失败：' + usernameCheck.error.message }
  }
  if (usernameCheck.data) {
    return { ok: false, status: 409, message: '用户名已存在' }
  }

  const phoneCheck = await findUserByPhone(normalizedPhone, 'id')
  if (!phoneCheck.ok) {
    return { ok: false, status: 500, message: '注册失败：' + phoneCheck.error.message }
  }
  if (phoneCheck.data) {
    return { ok: false, status: 409, message: '手机号已存在' }
  }

  const passwordHash = await hashPassword(password)
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      username: normalizedUsername,
      phone: normalizedPhone,
      password_hash: passwordHash,
      role
    })
    .select('id, username, phone, role')
    .single()

  if (error) {
    return { ok: false, status: 500, message: '注册失败：' + error.message }
  }

  return { ok: true, status: 201, data: newUser }
}

const login = async ({ phone, username, password }) => {
  const normalizedUsername = normalizeUsername(username)
  const normalizedPhone = normalizePhone(phone)
  const identifier = normalizedUsername || normalizedPhone

  if (!identifier || !password) {
    return { ok: false, status: 400, message: 'phone(或username)、password 为必填项' }
  }
  if (normalizedPhone && !isValidPhone(normalizedPhone)) {
    return { ok: false, status: 400, message: '手机号格式不正确' }
  }
  const phoneCandidate = normalizedPhone || (isValidPhone(identifier) ? identifier : '')

  const usernameResult = await findUserByUsername(identifier, '*')
  if (!usernameResult.ok) {
    return { ok: false, status: 500, message: '登录失败：' + usernameResult.error.message }
  }
  let user = usernameResult.data

  if (!user && phoneCandidate) {
    const phoneResult = await findUserByPhone(phoneCandidate, '*')
    if (!phoneResult.ok) {
      return { ok: false, status: 500, message: '登录失败：' + phoneResult.error.message }
    }
    user = phoneResult.data
  }

  if (!user) {
    return { ok: false, status: 401, message: '账号或密码错误' }
  }

  const match = await verifyPassword(password, user.password_hash)
  if (!match) {
    return { ok: false, status: 401, message: '账号或密码错误' }
  }

  const token = signToken({ id: user.id, role: user.role })
  return { ok: true, status: 200, data: { token, userRole: user.role, username: user.username } }
}

const registerByPhone = async ({ phone, code }) => {
  const normalizedPhone = normalizePhone(phone)
  const normalizedCode = normalizeCode(code)

  if (!normalizedPhone || !normalizedCode) {
    return { ok: false, status: 400, message: 'phone、code 为必填项' }
  }
  if (!isValidPhone(normalizedPhone)) {
    return { ok: false, status: 400, message: '手机号格式不正确' }
  }

  const codeCheck = await verifyCode({ phone: normalizedPhone, code: normalizedCode })
  if (!codeCheck.ok) {
    return { ok: false, status: 400, message: codeCheck.message }
  }

  const phoneResult = await findUserByPhone(normalizedPhone, 'id')
  if (!phoneResult.ok) {
    return { ok: false, status: 500, message: '注册失败：' + phoneResult.error.message }
  }
  if (phoneResult.data) {
    return { ok: false, status: 409, message: '手机号已注册，请直接登录' }
  }

  const legacyUsernameResult = await findUserByUsername(normalizedPhone, 'id')
  if (!legacyUsernameResult.ok) {
    return { ok: false, status: 500, message: '注册失败：' + legacyUsernameResult.error.message }
  }
  if (legacyUsernameResult.data) {
    return { ok: false, status: 409, message: '手机号已注册，请直接登录' }
  }

  const passwordHash = await hashPassword(`phone_${normalizedPhone}_${Date.now()}`)
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      username: normalizedPhone,
      phone: normalizedPhone,
      password_hash: passwordHash,
      role: 'user'
    })
    .select('id, username, phone, role')
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
  const normalizedPhone = normalizePhone(phone || username)
  const normalizedCode = normalizeCode(code)

  if (!normalizedPhone || !normalizedCode) {
    return { ok: false, status: 400, message: 'phone、code 为必填项' }
  }
  if (!isValidPhone(normalizedPhone)) {
    return { ok: false, status: 400, message: '手机号格式不正确' }
  }

  const codeCheck = await verifyCode({ phone: normalizedPhone, code: normalizedCode })
  if (!codeCheck.ok) {
    return { ok: false, status: 400, message: codeCheck.message }
  }

  const phoneResult = await findUserByPhone(normalizedPhone, 'id, username, phone, role')
  if (!phoneResult.ok) {
    return { ok: false, status: 500, message: '登录失败：' + phoneResult.error.message }
  }
  let user = phoneResult.data

  if (!user) {
    const legacyUsernameResult = await findUserByUsername(normalizedPhone, 'id, username, role')
    if (!legacyUsernameResult.ok) {
      return { ok: false, status: 500, message: '登录失败：' + legacyUsernameResult.error.message }
    }
    user = legacyUsernameResult.data
  }

  if (!user) {
    return {
      ok: false,
      status: 404,
      message: '手机号未注册，请先注册'
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
