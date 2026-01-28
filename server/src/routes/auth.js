const express = require('express')
const { hashPassword, verifyPassword, signToken } = require('../utils/auth')
const store = require('../data/store')

const router = express.Router()

router.post('/register', async (req, res) => {
  const { username, password, role } = req.body || {}
  if (!username || !password || !role) {
    res.status(400).json({ message: 'username、password、role 为必填项' })
    return
  }
  if (!['merchant', 'admin'].includes(role)) {
    res.status(400).json({ message: 'role 必须是 merchant 或 admin' })
    return
  }
  const exists = store.users.find((user) => user.username === username)
  if (exists) {
    res.status(409).json({ message: '用户名已存在' })
    return
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
  res.status(201).json({ id: newUser.id, username: newUser.username, role: newUser.role })
})

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) {
    res.status(400).json({ message: 'username、password 为必填项' })
    return
  }
  const user = store.users.find((item) => item.username === username)
  if (!user) {
    res.status(401).json({ message: '账号或密码错误' })
    return
  }
  const match = await verifyPassword(password, user.password_hash)
  if (!match) {
    res.status(401).json({ message: '账号或密码错误' })
    return
  }
  const token = signToken({ id: user.id, role: user.role })
  res.json({ token, userRole: user.role })
})

module.exports = router
