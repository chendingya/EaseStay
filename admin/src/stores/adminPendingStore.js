import { create } from 'zustand'
import { api } from '../services'
import { useSessionStore } from './sessionStore'

const toCount = (data) => {
  if (Array.isArray(data?.list)) return Number(data.total) || 0
  if (Array.isArray(data)) return data.length
  return 0
}

export const useAdminPendingStore = create((set) => ({
  pendingHotels: 0,
  pendingRequests: 0,
  loading: false,
  refreshPending: async () => {
    const { token, role } = useSessionStore.getState()
    if (!token || role !== 'admin') {
      set({ pendingHotels: 0, pendingRequests: 0, loading: false })
      return { pendingHotels: 0, pendingRequests: 0 }
    }
    set({ loading: true })
    try {
      const [hotels, requests] = await Promise.all([
        api.get('/api/admin/hotels?status=pending'),
        api.get('/api/admin/requests?status=pending')
      ])
      const next = {
        pendingHotels: toCount(hotels),
        pendingRequests: toCount(requests)
      }
      set({ ...next, loading: false })
      return next
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },
  clearPending: () => {
    set({ pendingHotels: 0, pendingRequests: 0, loading: false })
  }
}))

export default useAdminPendingStore
