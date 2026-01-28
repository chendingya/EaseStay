const express = require('express')
const cors = require('cors')
const authRoutes = require('./routes/auth')
const merchantHotelRoutes = require('./routes/merchantHotels')
const adminHotelRoutes = require('./routes/adminHotels')
const publicHotelRoutes = require('./routes/publicHotels')
const { authRequired, requireRole } = require('./middleware/auth')

const app = express()

app.use(cors())
app.use(express.json({ limit: '2mb' }))

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRoutes)
app.use('/api/merchant/hotels', authRequired, requireRole('merchant'), merchantHotelRoutes)
app.use('/api/admin/hotels', authRequired, requireRole('admin'), adminHotelRoutes)
app.use('/api/hotels', publicHotelRoutes)

module.exports = app
