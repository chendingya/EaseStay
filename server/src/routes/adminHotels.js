const express = require('express')
const { list, cities, getDetail, updateStatus, offline, restore, roomTypeStats, batchDiscount, batchRoom, roomOverview, orders, orderStats } = require('../controllers/adminHotelsController')

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
 *       - name: keyword
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *       - name: city
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: number
 *       - name: pageSize
 *         in: query
 *         required: false
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: ok
 */
router.get('/', list)
/**
 * @openapi
 * /api/admin/hotels/cities:
 *   get:
 *     tags:
 *       - Admin
 *     summary: 管理员酒店城市列表
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ok
 */
router.get('/cities', cities)
router.get('/room-type-stats', roomTypeStats)
router.post('/batch-discount', batchDiscount)
router.post('/batch-room', batchRoom)

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
router.get('/:id/overview', roomOverview)
router.get('/:id/orders', orders)
router.get('/:id/order-stats', orderStats)

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

/**
 * @openapi
 * /api/admin/hotels/{id}/offline:
 *   put:
 *     tags:
 *       - Admin
 *     summary: 下架酒店
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: number
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: ok
 */
router.put('/:id/offline', offline)

/**
 * @openapi
 * /api/admin/hotels/{id}/restore:
 *   put:
 *     tags:
 *       - Admin
 *     summary: 恢复上架酒店
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
router.put('/:id/restore', restore)

module.exports = router
