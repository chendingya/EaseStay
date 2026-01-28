const express = require('express')
const store = require('../data/store')

const router = express.Router()

const getLowestPrice = (hotelId) => {
  const roomTypes = store.roomTypes.filter((room) => room.hotel_id === hotelId)
  if (!roomTypes.length) return null
  return roomTypes.reduce((min, current) => (current.price < min ? current.price : min), roomTypes[0].price)
}

router.get('/', (req, res) => {
  const {
    city,
    keyword,
    sort,
    page = 1,
    pageSize = 10
  } = req.query

  const normalizedPage = Math.max(Number(page) || 1, 1)
  const normalizedPageSize = Math.max(Number(pageSize) || 10, 1)

  let hotels = store.hotels.filter((hotel) => hotel.status === 'approved')

  if (city) {
    hotels = hotels.filter((hotel) => hotel.city === city)
  }
  if (keyword) {
    hotels = hotels.filter((hotel) => hotel.name.includes(keyword) || hotel.address.includes(keyword))
  }

  const enriched = hotels.map((hotel) => ({
    ...hotel,
    lowestPrice: getLowestPrice(hotel.id)
  }))

  if (sort === 'price_asc') {
    enriched.sort((a, b) => (a.lowestPrice || 0) - (b.lowestPrice || 0))
  }
  if (sort === 'score_desc') {
    enriched.sort((a, b) => (b.star_rating || 0) - (a.star_rating || 0))
  }

  const start = (normalizedPage - 1) * normalizedPageSize
  const end = start + normalizedPageSize
  const paged = enriched.slice(start, end)

  res.json({
    page: normalizedPage,
    pageSize: normalizedPageSize,
    total: enriched.length,
    list: paged
  })
})

router.get('/:id', (req, res) => {
  const hotelId = Number(req.params.id)
  const hotel = store.hotels.find((item) => item.id === hotelId && item.status === 'approved')
  if (!hotel) {
    res.status(404).json({ message: '酒店不存在或未上架' })
    return
  }
  const roomTypes = store.roomTypes
    .filter((room) => room.hotel_id === hotelId)
    .sort((a, b) => a.price - b.price)
  res.json({ ...hotel, roomTypes })
})

module.exports = router
