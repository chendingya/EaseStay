const {
  createHotel,
  updateHotel,
  listMerchantHotels,
  getMerchantHotel
} = require('../services/hotelService')

const create = (req, res) => {
  const result = createHotel({ merchantId: req.user.id, payload: req.body })
  if (!result.ok) {
    res.status(result.status).json({ message: result.message })
    return
  }
  res.status(result.status).json(result.data)
}

const update = (req, res) => {
  const result = updateHotel({
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

const list = (req, res) => {
  const result = listMerchantHotels({
    merchantId: req.user.id,
    status: req.query.status
  })
  res.status(result.status).json(result.data)
}

const detail = (req, res) => {
  const result = getMerchantHotel({
    merchantId: req.user.id,
    hotelId: Number(req.params.id)
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
  detail
}
