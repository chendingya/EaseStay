import Taro from '@tarojs/taro'

const FAVORITE_HOTELS_KEY = 'favorite_hotels'

const normalizeId = (value) => String(value || '')

export const getFavoriteHotels = () => {
  const list = Taro.getStorageSync(FAVORITE_HOTELS_KEY)
  if (!Array.isArray(list)) return []
  return list
}

export const saveFavoriteHotels = (list) => {
  Taro.setStorageSync(FAVORITE_HOTELS_KEY, Array.isArray(list) ? list : [])
}

export const isFavoriteHotel = (hotelId) => {
  const targetId = normalizeId(hotelId)
  return getFavoriteHotels().some((item) => normalizeId(item.id) === targetId)
}

export const toggleFavoriteHotel = (hotel) => {
  const targetId = normalizeId(hotel?.id)
  if (!targetId) {
    return { collected: false, list: getFavoriteHotels() }
  }

  const list = getFavoriteHotels()
  const index = list.findIndex((item) => normalizeId(item.id) === targetId)
  if (index >= 0) {
    const next = list.filter((item) => normalizeId(item.id) !== targetId)
    saveFavoriteHotels(next)
    return { collected: false, list: next }
  }

  const summary = {
    id: hotel.id,
    name: hotel.name || '',
    name_en: hotel.name_en || '',
    city: hotel.city || '',
    address: hotel.address || '',
    opening_time: hotel.opening_time || '',
    cover_image: hotel.cover_image || (Array.isArray(hotel.images) ? hotel.images[0] : ''),
    lowestPrice: hotel.lowestPrice || null,
    savedAt: new Date().toISOString()
  }
  const next = [summary, ...list].slice(0, 200)
  saveFavoriteHotels(next)
  return { collected: true, list: next }
}
