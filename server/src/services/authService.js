const store = require('../data/store')
const { hashPassword, verifyPassword, signToken } = require('../utils/auth')
const { verifyCode } = require('./smsService')

const register = async ({ username, password, role, code }) => {
  if (!username || !password || !role || !code) {
    return { ok: false, status: 400, message: 'username、password、role、code 为必填项' }
  }
  if (!['merchant', 'admin'].includes(role)) {
    return { ok: false, status: 400, message: 'role 必须是 merchant 或 admin' }
  }
  const codeCheck = verifyCode({ username, code })
  if (!codeCheck.ok) {
    return { ok: false, status: 400, message: codeCheck.message }
  }
  const exists = store.users.find((user) => user.username === username)
  if (exists) {
    return { ok: false, status: 409, message: '用户名已存在' }
  }
  const passwordHash = await hashPassword(password)
  const newUser = {
    id: store.sequences.userId++,
    username,
    password_hash: passwordHash,
    role,
    created_at: new Date().toISOString()
  }
  store.users.push(newUser)
  return { ok: true, status: 201, data: { id: newUser.id, username: newUser.username, role: newUser.role } }
}

const login = async ({ username, password }) => {
  if (!username || !password) {
    return { ok: false, status: 400, message: 'username、password 为必填项' }
  }
  const user = store.users.find((item) => item.username === username)
  if (!user) {
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
