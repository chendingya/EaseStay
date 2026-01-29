const store = require('../data/store')

const createCode = () => String(Math.floor(100000 + Math.random() * 900000))

const sendCode = ({ username }) => {
  if (!username) {
    return { ok: false, message: 'username 为必填项' }
  }
  const code = createCode()
  const expiresAt = Date.now() + 5 * 60 * 1000
  store.smsCodes[username] = { code, expiresAt }
  return { ok: true, code, expiresAt }
}

const verifyCode = ({ username, code }) => {
  const record = store.smsCodes[username]
  if (!record) return { ok: false, message: '验证码不存在或已过期' }
  if (Date.now() > record.expiresAt) {
    delete store.smsCodes[username]
    return { ok: false, message: '验证码已过期' }
  }
  if (record.code !== code) {
    return { ok: false, message: '验证码错误' }
  }
  delete store.smsCodes[username]
  return { ok: true }
}

module.exports = {
  sendCode,
  verifyCode
}
