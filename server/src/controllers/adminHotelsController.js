const { listAdminHotels, updateHotelStatus, getAdminHotelDetail } = require('../services/hotelService')

const list = async (req, res) => {
  const result = await listAdminHotels({ status: req.query.status })
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

module.exports = {
  list,
  getDetail,
  updateStatus
}
