const express = require('express')
const { list, detail, createOrder } = require('../controllers/publicHotelsController')

const router = express.Router()

/**
 * @openapi
 * /api/hotels:
 *   get:
 *     tags:
 *       - Public
 *     summary: 酒店查询
 *     parameters:
 *       - name: city
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *       - name: keyword
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *       - name: sort
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
 * /api/hotels/{id}:
 *   get:
 *     tags:
 *       - Public
 *     summary: 酒店详情
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
router.get('/:id', detail)

/**
 * @openapi
 * /api/hotels/{id}/orders:
 *   post:
 *     tags:
 *       - Public
 *     summary: 创建酒店订单
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
 *             type: object
 *             properties:
 *               roomTypeId:
 *                 type: number
 *               roomTypeName:
 *                 type: string
 *               quantity:
 *                 type: number
 *               checkIn:
 *                 type: string
 *               checkOut:
 *                 type: string
 *     responses:
 *       201:
 *         description: ok
 */
router.post('/:id/orders', createOrder)

module.exports = router
