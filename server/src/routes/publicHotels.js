const express = require('express')
const { list, detail } = require('../controllers/publicHotelsController')

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

module.exports = router
