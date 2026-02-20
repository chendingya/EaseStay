export const formatDate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const parseLocalDate = (value) => {
  if (!value) return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate())
  }

  const text = String(value).trim()
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) {
    const year = Number(match[1])
    const month = Number(match[2]) - 1
    const day = Number(match[3])
    const parsed = new Date(year, month, day)
    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() === month &&
      parsed.getDate() === day
    ) {
      return parsed
    }
    return null
  }

  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) return null
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
}

export const addDays = (dateValue, days) => {
  const base = parseLocalDate(dateValue)
  if (!base) return null
  const next = new Date(base)
  next.setDate(next.getDate() + Number(days || 0))
  return next
}

export const getTodayRange = () => {
  const now = new Date()
  const checkInDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const checkOutDate = addDays(checkInDate, 1)
  return {
    checkIn: formatDate(checkInDate),
    checkOut: formatDate(checkOutDate),
    checkInDate,
    checkOutDate
  }
}

export const resolveDateRange = ({ checkIn, checkOut } = {}, fallback = getTodayRange()) => {
  const today = fallback?.checkInDate || parseLocalDate(fallback?.checkIn) || parseLocalDate(new Date())
  const parsedCheckIn = parseLocalDate(checkIn)
  const parsedCheckOut = parseLocalDate(checkOut)

  // 优先沿用已选择/缓存的有效日期，只有缺失或非法时才回退到 today
  const safeCheckInDate = parsedCheckIn || today
  const safeCheckOutDate = parsedCheckOut && parsedCheckOut > safeCheckInDate
    ? parsedCheckOut
    : (addDays(safeCheckInDate, 1) || safeCheckInDate)

  return {
    checkIn: formatDate(safeCheckInDate),
    checkOut: formatDate(safeCheckOutDate),
    checkInDate: safeCheckInDate,
    checkOutDate: safeCheckOutDate
  }
}
