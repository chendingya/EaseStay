const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'yisu_dev_secret'
const JWT_EXPIRES_IN = '7d'

const hashPassword = async (password) => bcrypt.hash(password, 10)
const verifyPassword = async (password, hash) => bcrypt.compare(password, hash)

const signToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

const verifyToken = (token) => jwt.verify(token, JWT_SECRET)

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken
}
