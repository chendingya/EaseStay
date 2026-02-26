import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

const emptySession = { token: '', role: '', username: '' }

const readLegacySession = () => {
  if (typeof window === 'undefined') return emptySession
  try {
    return {
      token: localStorage.getItem('token') || '',
      role: localStorage.getItem('role') || '',
      username: localStorage.getItem('username') || ''
    }
  } catch {
    return emptySession
  }
}

const syncLegacySession = ({ token, role, username }) => {
  if (typeof window === 'undefined') return
  try {
    if (token) localStorage.setItem('token', token)
    else localStorage.removeItem('token')

    if (role) localStorage.setItem('role', role)
    else localStorage.removeItem('role')

    if (username) localStorage.setItem('username', username)
    else localStorage.removeItem('username')
  } catch {
    // ignore localStorage failures
  }
}

export const useSessionStore = create(
  persist(
    (set) => ({
      ...readLegacySession(),
      setSession: ({ token = '', role = '', username = '' }) => {
        const next = { token, role, username }
        syncLegacySession(next)
        set(next)
      },
      clearSession: () => {
        syncLegacySession(emptySession)
        set(emptySession)
      }
    }),
    {
      name: 'admin-session',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        role: state.role,
        username: state.username
      })
    }
  )
)

export default useSessionStore
