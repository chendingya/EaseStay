import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getNotifications, getUnreadCount, markAsRead, deleteNotification, onUnreadCountChange } from '../../src/services/notificationService'

const mockGet = vi.fn()
const mockPut = vi.fn()
const mockDelete = vi.fn()

vi.mock('../../src/services/request', () => ({
  api: {
    get: (...args) => mockGet(...args),
    put: (...args) => mockPut(...args),
    delete: (...args) => mockDelete(...args)
  }
}))

describe('notificationService', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPut.mockReset()
    mockDelete.mockReset()
  })

  it('getNotifications appends unreadOnly query', async () => {
    mockGet.mockResolvedValue([])
    await getNotifications({ unreadOnly: true })
    expect(mockGet).toHaveBeenCalledWith('/api/notifications?unreadOnly=true')
  })

  it('getUnreadCount returns count from api', async () => {
    mockGet.mockResolvedValue({ count: 5 })
    const count = await getUnreadCount()
    expect(count).toBe(5)
  })

  it('markAsRead triggers unread update', async () => {
    const listener = vi.fn()
    const unsubscribe = onUnreadCountChange(listener)
    mockPut.mockResolvedValue({})
    mockGet.mockResolvedValue({ count: 2 })
    await markAsRead()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(listener).toHaveBeenCalledWith(2)
    unsubscribe()
  })

  it('deleteNotification triggers unread update', async () => {
    const listener = vi.fn()
    const unsubscribe = onUnreadCountChange(listener)
    mockDelete.mockResolvedValue({})
    mockGet.mockResolvedValue({ count: 1 })
    await deleteNotification(9)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(listener).toHaveBeenCalledWith(1)
    unsubscribe()
  })
})
