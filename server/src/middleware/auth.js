/**
 * 认证模块
 * 包含密码加密、JWT 令牌处理和 Express 认证中间件
 */

const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

// ========== JWT 配置 ==========
const JWT_SECRET = process.env.JWT_SECRET || 'yisu_dev_secret'
const JWT_EXPIRES_IN = '7d'

// ========== 密码工具 ==========
const hashPassword = async (password) => bcrypt.hash(password, 10)
const verifyPassword = async (password, hash) => bcrypt.compare(password, hash)

// ========== JWT 工具 ==========
const signToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
const verifyToken = (token) => jwt.verify(token, JWT_SECRET)

// ========== Express 中间件 ==========

/**
 * 认证必需中间件 - 验证请求中的 Bearer Token
 */
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

/**
 * 角色检查中间件 - 验证用户角色
 */
const requireRole = (role) => (req, res, next) => {
  if (!req.user || req.user.role !== role) {
    res.status(403).json({ message: '权限不足' })
    return
  }
  next()
}

/**
 * 认证可选中间件 - 如果请求中包含 Token 则验证，否则跳过
 */
const authOptional = (req, res, next) => {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (token) {
    try {
      req.user = verifyToken(token)
    } catch (error) {
      // Token 无效时不报错，视为未登录
    }
  }
  next()
}

module.exports = {
  // 密码工具
  hashPassword,
  verifyPassword,
  // JWT 工具
  signToken,
  verifyToken,
  // Express 中间件
  authRequired,
  authOptional,
  requireRole
}
