const {
  listAdminHotels,
  listAdminHotelCities,
  updateHotelStatus,
  getAdminHotelDetail,
  getRoomTypeStatsByHotelIds,
  batchSetRoomDiscount,
  batchRoomOperation,
  getHotelRoomOverview,
  listHotelOrders,
  getHotelOrderStats
} = require('../services/hotelService')

const list = async (req, res) => {
  const result = await listAdminHotels({
    status: req.query.status,
    keyword: req.query.keyword,
    city: req.query.city,
    page: req.query.page,
    pageSize: req.query.pageSize
  })
  if (!result.ok) {
    res.status(result.status).json({ message: result.message })
    return
  }
  res.status(result.status).json(result.data)
}

const cities = async (req, res) => {
  const result = await listAdminHotelCities()
  if (!result.ok) {
    res.status(result.status).json({ message: result.message })
    return
  }
  res.status(result.status).json(result.data)
}

const getDetail = async (req, res) => {
  const result = await getAdminHotelDetail({ hotelId: Number(req.params.id) })
  if (!result.ok) {
    res.status(result.status).json({ message: result.message })
    return
  }
  res.status(result.status).json(result.data)
}

const updateStatus = async (req, res) => {
  const result = await updateHotelStatus({
    hotelId: Number(req.params.id),
    status: req.body?.status,
    rejectReason: req.body?.rejectReason
  })
  if (!result.ok) {
    res.status(result.status).json({ message: result.message })
    return
  }
  res.status(result.status).json(result.data)
}

const offline = async (req, res) => {
  const result = await updateHotelStatus({
    hotelId: Number(req.params.id),
    status: 'offline',
    rejectReason: req.body?.reason
  })
  if (!result.ok) {
    res.status(result.status).json({ message: result.message })
    return
  }
  res.status(result.status).json(result.data)
}

const restore = async (req, res) => {
  const result = await updateHotelStatus({
    hotelId: Number(req.params.id),
    status: 'restore'
  })
  if (!result.ok) {
    res.status(result.status).json({ message: result.message })
    return
  }
  res.status(result.status).json(result.data)
}

const roomTypeStats = async (req, res) => {
  const hotelIds = (req.query.hotelIds || '')
    .split(',')
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id))

  const result = await getRoomTypeStatsByHotelIds(hotelIds)
  if (!result.ok) {
    res.status(result.status).json({ message: result.message })
    return
  }
  res.status(result.status).json(result.data)
}

const batchDiscount = async (req, res) => {
  const { hotelIds, roomTypeName, quantity, discount, periods } = req.body || {}
  const result = await batchSetRoomDiscount({
    hotelIds: Array.isArray(hotelIds) ? hotelIds : [],
    roomTypeName,
    quantity,
    discount,
    periods
  })
  if (!result.ok) {
    res.status(result.status).json({ message: result.message })
    return
  }
  res.status(result.status).json(result.data)
}

const batchRoom = async (req, res) => {
  const { hotelIds, roomTypeName, action, quantity, stock } = req.body || {}
  const result = await batchRoomOperation({
    hotelIds: Array.isArray(hotelIds) ? hotelIds : [],
    roomTypeName,
    action,
    quantity,
    stock
  })
  if (!result.ok) {
    res.status(result.status).json({ message: result.message })
    return
  }
  res.status(result.status).json(result.data)
}

const roomOverview = async (req, res) => {
  const result = await getHotelRoomOverview({ hotelId: Number(req.params.id) })
  if (!result.ok) {
    res.status(result.status).json({ message: result.message })
    return
  }
  res.status(result.status).json(result.data)
}

const orders = async (req, res) => {
  const result = await listHotelOrders({
    hotelId: Number(req.params.id),
    page: req.query.page,
    pageSize: req.query.pageSize
  })
  if (!result.ok) {
    res.status(result.status).json({ message: result.message })
    return
  }
  res.status(result.status).json(result.data)
}

const orderStats = async (req, res) => {
  const result = await getHotelOrderStats({
    hotelId: Number(req.params.id)
  })
  if (!result.ok) {
    res.status(result.status).json({ message: result.message })
    return
  }
  res.status(result.status).json(result.data)
}

module.exports = {
  list,
  cities,
  getDetail,
  updateStatus,
  offline,
  restore,
  roomTypeStats,
  batchDiscount,
  batchRoom,
  roomOverview,
  orders,
  orderStats
}
