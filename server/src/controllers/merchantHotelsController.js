const {
  createHotel,
  updateHotel,
  listMerchantHotels,
  getMerchantHotel,
  updateMerchantHotelStatus,
  getRoomTypeStatsByHotelIds,
  batchSetRoomDiscount,
  batchRoomOperation,
  getHotelRoomOverview,
  listHotelOrders,
  getHotelOrderStats,
  getMerchantOverview
} = require('../services/hotelService')

const create = async (req, res) => {
  const result = await createHotel({ merchantId: req.user.id, payload: req.body })
  if (!result.ok) {
    res.status(result.status).json({ message: result.message })
    return
  }
  res.status(result.status).json(result.data)
}

const update = async (req, res) => {
  const result = await updateHotel({
    merchantId: req.user.id,
    hotelId: Number(req.params.id),
    payload: req.body
  })
  if (!result.ok) {
    res.status(result.status).json({ message: result.message })
    return
  }
  if (result.warning) {
    res.status(result.status).json({ ...result.data, warning: result.warning })
    return
  }
  res.status(result.status).json(result.data)
}

const list = async (req, res) => {
  const result = await listMerchantHotels({
    merchantId: req.user.id,
    status: req.query.status
  })
  res.status(result.status).json(result.data)
}

const detail = async (req, res) => {
  const result = await getMerchantHotel({
    merchantId: req.user.id,
    hotelId: Number(req.params.id)
  })
  if (!result.ok) {
    res.status(result.status).json({ message: result.message })
    return
  }
  res.status(result.status).json(result.data)
}

const updateStatus = async (req, res) => {
  const { action } = req.body
  const result = await updateMerchantHotelStatus({
    merchantId: req.user.id,
    hotelId: Number(req.params.id),
    action
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
    periods,
    merchantId: req.user.id
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
    stock,
    merchantId: req.user.id
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
    merchantId: req.user.id,
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
    merchantId: req.user.id,
    hotelId: Number(req.params.id)
  })
  if (!result.ok) {
    res.status(result.status).json({ message: result.message })
    return
  }
  res.status(result.status).json(result.data)
}

const overview = async (req, res) => {
  const result = await getMerchantOverview({ merchantId: req.user.id })
  if (!result.ok) {
    res.status(result.status).json({ message: result.message })
    return
  }
  res.status(result.status).json(result.data)
}

module.exports = {
  create,
  update,
  list,
  detail,
  updateStatus,
  roomTypeStats,
  batchDiscount,
  batchRoom,
  roomOverview,
  orders,
  orderStats,
  overview
}
