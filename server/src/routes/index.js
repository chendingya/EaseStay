const express = require('express')
const authRoutes = require('./auth')
const merchantHotelRoutes = require('./merchantHotels')
const adminHotelRoutes = require('./adminHotels')
const publicHotelRoutes = require('./publicHotels')
const statusRoutes = require('./status')
const { authRequired, requireRole } = require('../middleware/auth')

const router = express.Router()

router.use('/auth', authRoutes)
router.use('/merchant/hotels', authRequired, requireRole('merchant'), merchantHotelRoutes)
router.use('/admin/hotels', authRequired, requireRole('admin'), adminHotelRoutes)
router.use('/hotels', publicHotelRoutes)

module.exports = {
  apiRouter: router,
  statusRoutes
}
