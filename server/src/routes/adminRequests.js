const express = require('express')
const router = express.Router()
const requestController = require('../controllers/requestController')

/**
 * @swagger
 * /api/admin/requests:
 *   get:
 *     summary: 管理员获取待审核申请列表
 *     tags: [Admin Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [facility, room_type, promotion, hotel_delete]
 *     responses:
 *       200:
 *         description: 待审核申请列表
 */
router.get('/', requestController.getPendingRequests)
router.get('/summary', requestController.getAdminPendingSummary)

/**
 * @swagger
 * /api/admin/requests/{id}/review:
 *   put:
 *     summary: 管理员审核申请
 *     tags: [Admin Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve, reject]
 *               rejectReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: 审核完成
 */
router.put('/:id/review', requestController.reviewRequest)

module.exports = router
