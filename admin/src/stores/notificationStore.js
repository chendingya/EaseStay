import { create } from 'zustand'
import {
  deleteNotification as deleteNotificationApi,
  getUnreadCount as getUnreadCountApi,
  markAsRead as markAsReadApi
} from '../services/notificationService'

export const useNotificationStore = create((set, get) => ({
  unreadCount: 0,
  loadingUnread: false,
  setUnreadCount: (count) => {
    set({ unreadCount: Math.max(Number(count) || 0, 0) })
  },
  refreshUnreadCount: async () => {
    set({ loadingUnread: true })
    try {
      const count = await getUnreadCountApi()
      set({ unreadCount: Math.max(Number(count) || 0, 0) })
      return count
    } finally {
      set({ loadingUnread: false })
    }
  },
  markAsRead: async (notificationId) => {
    const ok = await markAsReadApi(notificationId)
    if (ok) await get().refreshUnreadCount()
    return ok
  },
  deleteNotification: async (notificationId) => {
    const ok = await deleteNotificationApi(notificationId)
    if (ok) await get().refreshUnreadCount()
    return ok
  },
  clear: () => {
    set({ unreadCount: 0, loadingUnread: false })
  }
}))

export default useNotificationStore
