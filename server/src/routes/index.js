const express = require('express')
const authRoutes = require('./auth')
const merchantHotelRoutes = require('./merchantHotels')
const adminHotelRoutes = require('./adminHotels')
const publicHotelRoutes = require('./publicHotels')
const requestRoutes = require('./requests')
const presetRoutes = require('./presets')
const mapRoutes = require('./map')
const userRoutes = require('./user')
const statusRoutes = require('./status')
const notificationRoutes = require('./notifications')
const imageRoutes = require('./image')
const { authRequired, requireRole } = require('../middleware/auth')

const router = express.Router()

router.use('/auth', authRoutes)
router.use('/user', userRoutes)
router.use('/notifications', authRequired, notificationRoutes)
router.use('/merchant/hotels', authRequired, requireRole('merchant'), merchantHotelRoutes)
router.use('/admin/hotels', authRequired, requireRole('admin'), adminHotelRoutes)
router.use('/hotels', publicHotelRoutes)
router.use('/requests', authRequired, requestRoutes)
router.use('/admin/requests', authRequired, requireRole('admin'), require('./adminRequests'))
router.use('/presets', presetRoutes)
router.use('/admin/presets', authRequired, requireRole('admin'), require('./adminPresets'))
router.use('/map', mapRoutes)
router.use('/image', imageRoutes)

module.exports = {
  apiRouter: router,
  statusRoutes
}
