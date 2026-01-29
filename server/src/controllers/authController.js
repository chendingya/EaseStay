const { register, login } = require('../services/authService')
const { sendCode } = require('../services/smsService')

const sendSmsCode = async (req, res) => {
  const { username } = req.body || {}
  const result = await sendCode({ username })
  if (!result.ok) {
    res.status(400).json({ message: result.message })
    return
  }
  res.json({ message: '验证码已发送', code: result.code, expiresAt: result.expiresAt })
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

module.exports = {
  sendSmsCode,
  registerAccount,
  loginAccount
}
