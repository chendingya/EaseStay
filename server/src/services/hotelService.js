const store = require('../data/store')

const normalizeArray = (value) => (Array.isArray(value) ? value : [])

const buildRoomTypes = (hotelId, roomTypes = []) => {
  const normalized = []
  roomTypes.forEach((room) => {
    if (!room || !room.name) {
      return
    }
    const price = Number(room.price)
    if (!Number.isFinite(price)) {
      return
    }
    const stock = Number(room.stock)
    normalized.push({
      id: store.sequences.roomTypeId++,
      hotel_id: hotelId,
      name: room.name,
      price,
      stock: Number.isFinite(stock) ? stock : 0,
      created_at: new Date().toISOString()
    })
  })
  return normalized
}

const getLowestPrice = (hotelId) => {
  const roomTypes = store.roomTypes.filter((room) => room.hotel_id === hotelId)
  if (!roomTypes.length) return null
  return roomTypes.reduce((min, current) => (current.price < min ? current.price : min), roomTypes[0].price)
}

const createHotel = ({ merchantId, payload }) => {
  const {
    name,
    name_en,
    address,
    city,
    star_rating,
    opening_time,
    description,
    facilities,
    images,
    nearby_attractions,
    nearby_transport,
    nearby_malls,
    promotions,
    roomTypes
  } = payload || {}

  if (!name || !address || !city) {
    return { ok: false, status: 400, message: 'name、address、city 为必填项' }
  }

  const newHotel = {
    id: store.sequences.hotelId++,
    merchant_id: merchantId,
    name,
    name_en: name_en || '',
    address,
    city,
    star_rating: Number(star_rating) || 0,
    opening_time: opening_time || '',
    description: description || '',
    facilities: normalizeArray(facilities),
    images: normalizeArray(images),
    nearby_attractions: normalizeArray(nearby_attractions),
    nearby_transport: normalizeArray(nearby_transport),
    nearby_malls: normalizeArray(nearby_malls),
    promotions: normalizeArray(promotions),
    status: 'pending',
    reject_reason: '',
    created_at: new Date().toISOString()
  }

  store.hotels.push(newHotel)
  const createdRoomTypes = buildRoomTypes(newHotel.id, roomTypes)
  store.roomTypes.push(...createdRoomTypes)
  return { ok: true, status: 201, data: { ...newHotel, roomTypes: createdRoomTypes } }
}

const updateHotel = ({ merchantId, hotelId, payload }) => {
  const hotel = store.hotels.find((item) => item.id === hotelId)
  if (!hotel) {
    return { ok: false, status: 404, message: '酒店不存在' }
  }
  if (hotel.merchant_id !== merchantId) {
    return { ok: false, status: 403, message: '无权修改该酒店' }
  }

  const {
    name,
    name_en,
    address,
    city,
    star_rating,
    opening_time,
    description,
    facilities,
    images,
    nearby_attractions,
    nearby_transport,
    nearby_malls,
    promotions,
    roomTypes
  } = payload || {}

  if (name !== undefined) hotel.name = name
  if (name_en !== undefined) hotel.name_en = name_en
  if (address !== undefined) hotel.address = address
  if (city !== undefined) hotel.city = city
  if (star_rating !== undefined) hotel.star_rating = Number(star_rating) || 0
  if (opening_time !== undefined) hotel.opening_time = opening_time
  if (description !== undefined) hotel.description = description
  if (facilities !== undefined) hotel.facilities = normalizeArray(facilities)
  if (images !== undefined) hotel.images = normalizeArray(images)
  if (nearby_attractions !== undefined) hotel.nearby_attractions = normalizeArray(nearby_attractions)
  if (nearby_transport !== undefined) hotel.nearby_transport = normalizeArray(nearby_transport)
  if (nearby_malls !== undefined) hotel.nearby_malls = normalizeArray(nearby_malls)
  if (promotions !== undefined) hotel.promotions = normalizeArray(promotions)

  hotel.status = 'pending'
  hotel.reject_reason = ''

  if (Array.isArray(roomTypes)) {
    store.roomTypes = store.roomTypes.filter((item) => item.hotel_id !== hotelId)
    const updatedRoomTypes = buildRoomTypes(hotelId, roomTypes)
    store.roomTypes.push(...updatedRoomTypes)
  }

  const currentRoomTypes = store.roomTypes.filter((item) => item.hotel_id === hotelId)
  return { ok: true, status: 200, data: { ...hotel, roomTypes: currentRoomTypes } }
}

const listMerchantHotels = ({ merchantId, status }) => {
  let hotels = store.hotels.filter((hotel) => hotel.merchant_id === merchantId)
  if (status) {
    hotels = hotels.filter((hotel) => hotel.status === status)
  }
  const enriched = hotels.map((hotel) => ({
    ...hotel,
    lowestPrice: getLowestPrice(hotel.id)
  }))
  return { ok: true, status: 200, data: enriched }
}

const getMerchantHotel = ({ merchantId, hotelId }) => {
  const hotel = store.hotels.find((item) => item.id === hotelId)
  if (!hotel) {
    return { ok: false, status: 404, message: '酒店不存在' }
  }
  if (hotel.merchant_id !== merchantId) {
    return { ok: false, status: 403, message: '无权查看该酒店' }
  }
  const roomTypes = store.roomTypes.filter((item) => item.hotel_id === hotelId)
  return { ok: true, status: 200, data: { ...hotel, roomTypes } }
}

const listAdminHotels = ({ status }) => {
  const hotels = status
    ? store.hotels.filter((hotel) => hotel.status === status)
    : store.hotels
  const enriched = hotels.map((hotel) => ({
    ...hotel,
    lowestPrice: getLowestPrice(hotel.id)
  }))
  return { ok: true, status: 200, data: enriched }
}

const updateHotelStatus = ({ hotelId, status, rejectReason }) => {
  const hotel = store.hotels.find((item) => item.id === hotelId)
  if (!hotel) {
    return { ok: false, status: 404, message: '酒店不存在' }
  }

  const allowed = ['approved', 'rejected', 'offline', 'restore']
  if (!allowed.includes(status)) {
    return { ok: false, status: 400, message: 'status 不合法' }
  }

  if (status === 'rejected') {
    if (!rejectReason) {
      return { ok: false, status: 400, message: 'rejectReason 为必填' }
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

  return { ok: true, status: 200, data: hotel }
}

const listPublicHotels = ({ query }) => {
  const {
    city,
    keyword,
    sort,
    page = 1,
    pageSize = 10
  } = query || {}

  const normalizedPage = Math.max(Number(page) || 1, 1)
  const normalizedPageSize = Math.max(Number(pageSize) || 10, 1)

  let hotels = store.hotels.filter((hotel) => hotel.status === 'approved')

  if (city) {
    hotels = hotels.filter((hotel) => hotel.city === city)
  }
  if (keyword) {
    hotels = hotels.filter((hotel) => (
      hotel.name.includes(keyword)
      || (hotel.name_en || '').includes(keyword)
      || hotel.address.includes(keyword)
    ))
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

  return {
    ok: true,
    status: 200,
    data: {
      page: normalizedPage,
      pageSize: normalizedPageSize,
      total: enriched.length,
      list: paged
    }
  }
}

const getPublicHotel = ({ hotelId }) => {
  const hotel = store.hotels.find((item) => item.id === hotelId && item.status === 'approved')
  if (!hotel) {
    return { ok: false, status: 404, message: '酒店不存在或未上架' }
  }
  const roomTypes = store.roomTypes
    .filter((room) => room.hotel_id === hotelId)
    .sort((a, b) => a.price - b.price)
  return { ok: true, status: 200, data: { ...hotel, roomTypes } }
}

module.exports = {
  createHotel,
  updateHotel,
  listMerchantHotels,
  getMerchantHotel,
  listAdminHotels,
  updateHotelStatus,
  listPublicHotels,
  getPublicHotel
}
