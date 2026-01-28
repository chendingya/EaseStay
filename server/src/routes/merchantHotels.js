const express = require('express')
const store = require('../data/store')

const router = express.Router()

const buildRoomTypes = (hotelId, roomTypes = []) => {
  const normalized = []
  roomTypes.forEach((room) => {
    if (!room || !room.name || typeof room.price !== 'number') {
      return
    }
    normalized.push({
      id: store.sequences.roomTypeId++,
      hotel_id: hotelId,
      name: room.name,
      price: room.price,
      stock: room.stock || 0,
      created_at: new Date().toISOString()
    })
  })
  return normalized
}

router.post('/', (req, res) => {
  const merchantId = req.user.id
  const {
    name,
    address,
    city,
    star_rating,
    description,
    facilities,
    images,
    roomTypes
  } = req.body || {}

  if (!name || !address || !city) {
    res.status(400).json({ message: 'name、address、city 为必填项' })
    return
  }

  const newHotel = {
    id: store.sequences.hotelId++,
    merchant_id: merchantId,
    name,
    address,
    city,
    star_rating: Number(star_rating) || 0,
    description: description || '',
    facilities: Array.isArray(facilities) ? facilities : [],
    images: Array.isArray(images) ? images : [],
    status: 'pending',
    reject_reason: '',
    created_at: new Date().toISOString()
  }

  store.hotels.push(newHotel)
  const createdRoomTypes = buildRoomTypes(newHotel.id, roomTypes)
  store.roomTypes.push(...createdRoomTypes)
  res.status(201).json({ ...newHotel, roomTypes: createdRoomTypes })
})

router.put('/:id', (req, res) => {
  const merchantId = req.user.id
  const hotelId = Number(req.params.id)
  const hotel = store.hotels.find((item) => item.id === hotelId)
  if (!hotel) {
    res.status(404).json({ message: '酒店不存在' })
    return
  }
  if (hotel.merchant_id !== merchantId) {
    res.status(403).json({ message: '无权修改该酒店' })
    return
  }

  const {
    name,
    address,
    city,
    star_rating,
    description,
    facilities,
    images,
    roomTypes
  } = req.body || {}

  if (name !== undefined) hotel.name = name
  if (address !== undefined) hotel.address = address
  if (city !== undefined) hotel.city = city
  if (star_rating !== undefined) hotel.star_rating = Number(star_rating) || 0
  if (description !== undefined) hotel.description = description
  if (facilities !== undefined) hotel.facilities = Array.isArray(facilities) ? facilities : []
  if (images !== undefined) hotel.images = Array.isArray(images) ? images : []

  hotel.status = 'pending'
  hotel.reject_reason = ''

  if (Array.isArray(roomTypes)) {
    store.roomTypes = store.roomTypes.filter((item) => item.hotel_id !== hotelId)
    const updatedRoomTypes = buildRoomTypes(hotelId, roomTypes)
    store.roomTypes.push(...updatedRoomTypes)
  }

  const currentRoomTypes = store.roomTypes.filter((item) => item.hotel_id === hotelId)
  res.json({ ...hotel, roomTypes: currentRoomTypes })
})

module.exports = router
