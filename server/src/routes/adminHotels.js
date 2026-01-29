const express = require('express')
const { list, getDetail, updateStatus } = require('../controllers/adminHotelsController')

const router = express.Router()

/**
 * @openapi
 * /api/admin/hotels:
 *   get:
 *     tags:
 *       - Admin
 *     summary: 管理员酒店列表
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: status
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: ok
 */
router.get('/', list)

/**
 * @openapi
 * /api/admin/hotels/{id}:
 *   get:
 *     tags:
 *       - Admin
 *     summary: 管理员获取酒店详情
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: ok
 */
router.get('/:id', getDetail)

/**
 * @openapi
 * /api/admin/hotels/{id}/status:
 *   patch:
 *     tags:
 *       - Admin
 *     summary: 更新酒店状态
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminStatusUpdate'
 *     responses:
 *       200:
 *         description: ok
 */
router.patch('/:id/status', updateStatus)

module.exports = router
