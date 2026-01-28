const express = require('express')
const store = require('../data/store')

const router = express.Router()

router.get('/', (req, res) => {
  const { status } = req.query
  const hotels = status
    ? store.hotels.filter((hotel) => hotel.status === status)
    : store.hotels
  res.json(hotels)
})

router.patch('/:id/status', (req, res) => {
  const hotelId = Number(req.params.id)
  const { status, rejectReason } = req.body || {}
  const hotel = store.hotels.find((item) => item.id === hotelId)
  if (!hotel) {
    res.status(404).json({ message: '酒店不存在' })
    return
  }

  const allowed = ['approved', 'rejected', 'offline', 'restore']
  if (!allowed.includes(status)) {
    res.status(400).json({ message: 'status 不合法' })
    return
  }

  if (status === 'rejected') {
    if (!rejectReason) {
      res.status(400).json({ message: 'rejectReason 为必填' })
      return
    }
    hotel.status = 'rejected'
    hotel.reject_reason = rejectReason
  } else if (status === 'approved') {
    hotel.status = 'approved'
    hotel.reject_reason = ''
  } else if (status === 'offline') {
    hotel.status = 'offline'
  } else if (status === 'restore') {
    hotel.status = 'approved'
  }

  res.json(hotel)
})

module.exports = router
