const express = require('express')
const { renderStatusPage } = require('../controllers/statusController')

const router = express.Router()

/**
 * @openapi
 * /status:
 *   get:
 *     tags:
 *       - Status
 *     summary: 状态页
 *     responses:
 *       200:
 *         description: ok
 */
router.get('/', renderStatusPage)

module.exports = router
