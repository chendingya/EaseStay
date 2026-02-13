/**
 * 用户管理路由
 */

const express = require('express')
const router = express.Router()
const { authRequired, requireRole } = require('../middleware/auth')
const userController = require('../controllers/userController')

// 获取当前用户信息
router.get('/me', authRequired, userController.getCurrentUser)

// 获取当前用户订单（移动端）
router.get('/orders', authRequired, userController.getMyOrders)
router.get('/orders/:id', authRequired, userController.getMyOrderDetail)
router.post('/orders/:id/pay', authRequired, userController.payOrder)
router.post('/orders/:id/cancel', authRequired, userController.cancelOrder)
router.post('/orders/:id/use', authRequired, userController.useOrder)

// 修改密码
router.post('/change-password', authRequired, userController.changePassword)

// 管理员：获取商户列表
router.get('/merchants', authRequired, requireRole('admin'), userController.getMerchants)

// 管理员：获取商户详情
router.get('/merchants/:id', authRequired, requireRole('admin'), userController.getMerchantDetail)

// 管理员：重置商户密码
router.post('/merchants/:id/reset-password', authRequired, requireRole('admin'), userController.resetMerchantPassword)

module.exports = router
