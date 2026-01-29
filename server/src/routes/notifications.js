const express = require('express')
const { 
  getNotifications, 
  getNotificationUnreadCount, 
  markNotificationAsRead, 
  markAllAsRead 
} = require('../controllers/notificationController')

const router = express.Router()

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     tags:
 *       - Notifications
 *     summary: 获取用户通知列表
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: unreadOnly
 *         in: query
 *         required: false
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: ok
 */
router.get('/', getNotifications)

/**
 * @openapi
 * /api/notifications/unread-count:
 *   get:
 *     tags:
 *       - Notifications
 *     summary: 获取未读通知数量
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ok
 */
router.get('/unread-count', getNotificationUnreadCount)

/**
 * @openapi
 * /api/notifications/read-all:
 *   put:
 *     tags:
 *       - Notifications
 *     summary: 标记所有通知为已读
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ok
 */
router.put('/read-all', markAllAsRead)

/**
 * @openapi
 * /api/notifications/{id}/read:
 *   put:
 *     tags:
 *       - Notifications
 *     summary: 标记单条通知为已读
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
router.put('/:id/read', markNotificationAsRead)

module.exports = router
