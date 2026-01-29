const { listPublicHotels, getPublicHotel } = require('../services/hotelService')

const list = async (req, res) => {
  const result = await listPublicHotels({ query: req.query })
  res.status(result.status).json(result.data)
}

const detail = async (req, res) => {
  const result = await getPublicHotel({ hotelId: Number(req.params.id) })
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
