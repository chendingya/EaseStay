/**
 * 预设数据路由
 * 公开接口，无需登录即可访问
 */

const express = require('express')
const router = express.Router()
const presetController = require('../controllers/presetController')

// 获取所有预设数据（合并接口，推荐使用）
router.get('/', presetController.getAllPresets)

// 单独获取各类预设数据
router.get('/facilities', presetController.getFacilities)
router.get('/room-types', presetController.getRoomTypes)
router.get('/promotion-types', presetController.getPromotionTypes)
router.get('/cities/hot', presetController.getHotCities)
router.get('/cities', presetController.getAllCities)

module.exports = router
