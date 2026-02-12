const { register, login, registerByPhone, loginByPhone } = require('../services/authService')
const { sendCode } = require('../services/smsService')

const sendSmsCode = async (req, res) => {
  const { username, phone } = req.body || {}
  const target = phone || username
  const result = await sendCode({ phone: target, username: target })
  if (!result.ok) {
    res.status(400).json({ message: result.message })
    return
  }
  res.json({ message: '验证码已发送', code: result.code, expiresAt: result.expiresAt, phone: target })
}

const registerAccount = async (req, res) => {
  const result = await register(req.body || {})
  if (!result.ok) {
    res.status(result.status).json({ message: result.message })
    return
  }
  res.status(result.status).json(result.data)
}

const loginAccount = async (req, res) => {
  const result = await login(req.body || {})
  if (!result.ok) {
    res.status(result.status).json({ message: result.message })
    return
  }
  res.status(result.status).json(result.data)
}

const registerPhoneAccount = async (req, res) => {
  const result = await registerByPhone(req.body || {})
  if (!result.ok) {
    res.status(result.status).json({ message: result.message })
    return
  }
  res.status(result.status).json(result.data)
}

const loginPhoneAccount = async (req, res) => {
  const result = await loginByPhone(req.body || {})
  if (!result.ok) {
    res.status(result.status).json({ message: result.message })
    return
  }
  res.status(result.status).json(result.data)
}

module.exports = {
  sendSmsCode,
  registerAccount,
  loginAccount,
  registerPhoneAccount,
  loginPhoneAccount
}
