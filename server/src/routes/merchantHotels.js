const express = require('express')
const { create, update, list, detail } = require('../controllers/merchantHotelsController')

const router = express.Router()

/**
 * @openapi
 * /api/merchant/hotels:
 *   get:
 *     tags:
 *       - Merchant
 *     summary: 商户酒店列表
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
 * /api/merchant/hotels:
 *   post:
 *     tags:
 *       - Merchant
 *     summary: 新增酒店
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HotelInput'
 *     responses:
 *       201:
 *         description: created
 */
router.post('/', create)

/**
 * @openapi
 * /api/merchant/hotels/{id}:
 *   get:
 *     tags:
 *       - Merchant
 *     summary: 商户酒店详情
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
router.get('/:id', detail)

/**
 * @openapi
 * /api/merchant/hotels/{id}:
 *   put:
 *     tags:
 *       - Merchant
 *     summary: 编辑酒店
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
 *             $ref: '#/components/schemas/HotelInput'
 *     responses:
 *       200:
 *         description: ok
 */
router.put('/:id', update)

module.exports = router
