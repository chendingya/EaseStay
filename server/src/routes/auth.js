const express = require('express')
const {
  sendSmsCode,
  registerAccount,
  loginAccount,
  registerPhoneAccount,
  loginPhoneAccount
} = require('../controllers/authController')

const router = express.Router()

/**
 * @openapi
 * /api/auth/sms/send:
 *   post:
 *     tags:
 *       - Auth
 *     summary: 发送验证码
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthSmsSend'
 *     responses:
 *       200:
 *         description: ok
 */
router.post('/sms/send', sendSmsCode)

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: 注册
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthRegister'
 *     responses:
 *       201:
 *         description: created
 */
router.post('/register', registerAccount)

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: 登录
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthLogin'
 *     responses:
 *       200:
 *         description: ok
 */
router.post('/login', loginAccount)

/**
 * @openapi
 * /api/auth/phone/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: 手机号验证码注册（模拟）
 *     responses:
 *       201:
 *         description: created
 */
router.post('/phone/register', registerPhoneAccount)

/**
 * @openapi
 * /api/auth/phone/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: 手机号验证码登录（模拟）
 *     responses:
 *       200:
 *         description: ok
 */
router.post('/phone/login', loginPhoneAccount)

module.exports = router
