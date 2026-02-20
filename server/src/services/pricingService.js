const normalizeArray = (value) => (Array.isArray(value) ? value : [])
const normalizeNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0)
const roundToTwo = (value) => Math.round(normalizeNumber(value) * 100) / 100

const parseTime = (value) => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.getTime()
}

const isDiscountValueValid = (value) => {
  const val = normalizeNumber(value)
  return (val > 0 && val <= 10) || val < 0
}

const applyDiscountValue = (price, discountValue) => {
  const base = normalizeNumber(price)
  const value = normalizeNumber(discountValue)
  if (value > 0 && value <= 10) {
    return base * (value / 10)
  }
  if (value < 0) {
    return Math.max(0, base + value)
  }
  return base
}

const resolveStayWindow = ({ checkIn, checkOut } = {}) => {
  const start = parseTime(checkIn)
  const end = parseTime(checkOut)
  if (start === null || end === null || end <= start) return null
  return { start, end }
}

const isPeriodEffective = (periods, { checkIn, checkOut, asOfDate } = {}) => {
  const ranges = normalizeArray(periods)
  if (!ranges.length) return true

  const stayWindow = resolveStayWindow({ checkIn, checkOut })
  if (stayWindow) {
    return ranges.some((range) => {
      const start = parseTime(range?.start)
      const end = parseTime(range?.end)
      if (start === null || end === null) return false
      return end >= stayWindow.start && start < stayWindow.end
    })
  }

  const now = parseTime(asOfDate || new Date())
  if (now === null) return false
  return ranges.some((range) => {
    const start = parseTime(range?.start)
    const end = parseTime(range?.end)
    if (start === null || end === null) return false
    return now >= start && now <= end
  })
}

const getEffectivePromotions = (promotions, context = {}) => {
  const list = normalizeArray(promotions).filter((promo) => promo && (promo.title || promo.type))
  return list.filter((promo) => isPeriodEffective(promo.periods, context))
}

const calculateRoomPrice = ({
  room,
  promotions = [],
  checkIn,
  checkOut,
  asOfDate
} = {}) => {
  const context = { checkIn, checkOut, asOfDate }
  const basePrice = roundToTwo(room?.price)

  let promotionAdjustedPrice = basePrice
  const effectivePromotions = getEffectivePromotions(promotions, context)
  effectivePromotions.forEach((promo) => {
    promotionAdjustedPrice = applyDiscountValue(promotionAdjustedPrice, promo?.value)
  })
  promotionAdjustedPrice = roundToTwo(promotionAdjustedPrice)

  const discountRate = normalizeNumber(room?.discount_rate)
  const discountQuota = normalizeNumber(room?.discount_quota)
  const hasRoomDiscount = discountQuota > 0 &&
    isDiscountValueValid(discountRate) &&
    isPeriodEffective(room?.discount_periods, context)

  let finalPrice = promotionAdjustedPrice
  if (hasRoomDiscount) {
    finalPrice = applyDiscountValue(finalPrice, discountRate)
  }
  finalPrice = roundToTwo(finalPrice)

  return {
    basePrice,
    promotionAdjustedPrice,
    finalPrice,
    hasRoomDiscount,
    roomDiscountRate: discountRate,
    roomDiscountQuota: discountQuota,
    roomDiscountLabel: hasRoomDiscount
      ? (discountRate < 0 ? `减¥${Math.abs(discountRate)}` : `${discountRate}折`)
      : '',
    effectivePromotions
  }
}

module.exports = {
  normalizeArray,
  normalizeNumber,
  roundToTwo,
  applyDiscountValue,
  isPeriodEffective,
  getEffectivePromotions,
  calculateRoomPrice
}
