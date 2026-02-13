const supabase = require('../config/supabase')

const normalizeNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0)

const formatDateOnly = (value) => {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const getActiveOrderQtyMap = async ({ roomTypeIds, asOfDate, checkIn, checkOut }) => {
  const ids = Array.isArray(roomTypeIds) ? roomTypeIds.filter((id) => Number.isFinite(Number(id))) : []
  if (!ids.length) return { ok: true, map: new Map() }

  let query = supabase
    .from('orders')
    .select('room_type_id, quantity')
    .in('room_type_id', ids)
    .in('status', ['pending_payment', 'confirmed'])

  const normalizedAsOf = asOfDate ? formatDateOnly(asOfDate) : null
  const normalizedCheckIn = checkIn ? formatDateOnly(checkIn) : null
  const normalizedCheckOut = checkOut ? formatDateOnly(checkOut) : null

  if (normalizedCheckIn && normalizedCheckOut) {
    query = query.lt('check_in', normalizedCheckOut).gt('check_out', normalizedCheckIn)
  } else if (normalizedAsOf) {
    query = query.gt('check_out', normalizedAsOf)
  }

  const { data, error } = await query
  if (error) {
    return { ok: false, message: '查询订单失败：' + error.message, map: new Map() }
  }

  const map = new Map()
  ;(data || []).forEach((row) => {
    const roomId = row.room_type_id
    const prev = map.get(roomId) || 0
    map.set(roomId, prev + normalizeNumber(row.quantity))
  })

  return { ok: true, map }
}

const computeRoomAvailability = ({ stock, used, isActive }) => {
  const available = isActive ? Math.max(stock - used, 0) : 0
  const offline = isActive ? 0 : Math.max(stock - used, 0)
  return { available, offline }
}

const roundToTwo = (value) => Math.round(normalizeNumber(value) * 100) / 100

module.exports = {
  formatDateOnly,
  getActiveOrderQtyMap,
  computeRoomAvailability,
  roundToTwo
}
