const { verifyToken } = require('../utils/auth')

const authRequired = (req, res, next) => {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    res.status(401).json({ message: '未登录或令牌缺失' })
    return
  }
  try {
    req.user = verifyToken(token)
    next()
  } catch (error) {
    res.status(401).json({ message: '令牌无效或已过期' })
  }
}

const requireRole = (role) => (req, res, next) => {
  if (!req.user || req.user.role !== role) {
    res.status(403).json({ message: '权限不足' })
    return
  }
  next()
}

module.exports = {
  authRequired,
  requireRole
}
