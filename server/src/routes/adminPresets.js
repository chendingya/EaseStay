/**
 * 管理员预设数据路由
 * 需要管理员权限
 */

const express = require('express')
const router = express.Router()
const presetController = require('../controllers/presetController')

// 添加预设设施
router.post('/facilities', presetController.addFacility)

// 添加预设房型
router.post('/room-types', presetController.addRoomType)

// 添加预设优惠类型
router.post('/promotion-types', presetController.addPromotionType)

// 添加城市
router.post('/cities', presetController.addCity)

module.exports = router
