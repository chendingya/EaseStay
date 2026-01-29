const { listAdminHotels, updateHotelStatus } = require('../services/hotelService')

const list = (req, res) => {
  const result = listAdminHotels({ status: req.query.status })
  res.status(result.status).json(result.data)
}

const updateStatus = (req, res) => {
  const result = updateHotelStatus({
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

module.exports = {
  list,
  updateStatus
}
