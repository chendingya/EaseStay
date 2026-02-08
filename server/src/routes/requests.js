const express = require('express')
const router = express.Router()
const requestController = require('../controllers/requestController')
const { authRequired } = require('../middleware/auth')

/**
 * @swagger
 * /api/requests:
 *   post:
 *     summary: 商家提交申请（设施/房型/优惠/删除酒店）
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - name
 *             properties:
 *               hotelId:
 *                 type: integer
 *               type:
 *                 type: string
 *               enum: [facility, room_type, promotion, hotel_delete]
 *               name:
 *                 type: string
 *               data:
 *                 type: object
 *     responses:
 *       201:
 *         description: 申请创建成功
 */
router.post('/', authRequired, requestController.createRequest)

/**
 * @swagger
 * /api/requests:
 *   get:
 *     summary: 商家获取自己的申请列表
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [facility, room_type, promotion, hotel_delete]
 *     responses:
 *       200:
 *         description: 申请列表
 */
router.get('/', authRequired, requestController.getMerchantRequests)

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: 获取用户通知
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: 通知列表
 */
router.get('/notifications', authRequired, requestController.getNotifications)

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     summary: 标记通知已读
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 已标记为已读
 */
router.put('/notifications/:id/read', authRequired, requestController.markNotificationRead)

/**
 * @swagger
 * /api/notifications/read-all:
 *   put:
 *     summary: 标记所有通知已读
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 已全部标记为已读
 */
router.put('/notifications/read-all', authRequired, requestController.markAllNotificationsRead)

module.exports = router
