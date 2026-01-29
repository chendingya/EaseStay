const { listPublicHotels, getPublicHotel } = require('../services/hotelService')

const list = (req, res) => {
  const result = listPublicHotels({ query: req.query })
  res.status(result.status).json(result.data)
}

const detail = (req, res) => {
  const result = getPublicHotel({ hotelId: Number(req.params.id) })
  if (!result.ok) {
    res.status(result.status).json({ message: result.message })
    return
  }
  res.status(result.status).json(result.data)
}

module.exports = {
  list,
  detail
}
