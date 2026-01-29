const {
  createHotel,
  updateHotel,
  listMerchantHotels,
  getMerchantHotel,
  updateMerchantHotelStatus
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

module.exports = {
  create,
  update,
  list,
  detail,
  updateStatus
}
