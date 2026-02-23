const express = require('express')
const { proxyImage } = require('../controllers/imageController')

const router = express.Router()

router.get('/', proxyImage)

module.exports = router
