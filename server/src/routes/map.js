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

module.exports = router
