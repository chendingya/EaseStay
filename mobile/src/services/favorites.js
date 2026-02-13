import { api } from './request'

const normalizeId = (value) => String(value || '')

export const getFavoriteHotels = async () => {
  const res = await api.get('/api/user/favorites')
  if (Array.isArray(res?.list)) return res.list
  if (Array.isArray(res)) return res
  return []
}

export const isFavoriteHotel = async (hotelId) => {
  const targetId = normalizeId(hotelId)
  if (!targetId) return false
  const res = await api.get(`/api/user/favorites/${targetId}`)
  return !!res?.collected
}

export const addFavoriteHotel = async (hotelId) => {
  const targetId = normalizeId(hotelId)
  if (!targetId) return { collected: false }
  const res = await api.post('/api/user/favorites', { hotelId: Number(targetId) })
  return res || { collected: true }
}

export const removeFavoriteHotel = async (hotelId) => {
  const targetId = normalizeId(hotelId)
  if (!targetId) return { collected: false }
  const res = await api.delete(`/api/user/favorites/${targetId}`)
  return res || { collected: false }
}

export const clearFavoriteHotels = async () => {
  const res = await api.delete('/api/user/favorites')
  return res || { success: true }
}

export const toggleFavoriteHotel = async (hotel) => {
  const targetId = normalizeId(hotel?.id)
  if (!targetId) {
    return { collected: false }
  }

  const collected = await isFavoriteHotel(targetId)
  if (collected) {
    await removeFavoriteHotel(targetId)
    return { collected: false }
  }

  await addFavoriteHotel(targetId)
  return { collected: true }
}
