/**
 * 地图 API 路由
 */

const express = require('express')
const router = express.Router()
const mapController = require('../controllers/mapController')

// POI 搜索
router.get('/search', mapController.searchPOI)

// 地理编码
router.get('/geocode', mapController.geocode)

// 逆地理编码
router.get('/regeocode', mapController.regeocode)

// 获取城市酒店坐标（地图找房核心接口）
router.get('/hotel-locations', mapController.hotelLocations)

module.exports = router

