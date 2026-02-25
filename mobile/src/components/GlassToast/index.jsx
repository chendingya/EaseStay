import { useEffect, useRef, useState } from 'react'
import { View, Text } from '@tarojs/components'
import { subscribeGlassToast } from '../../services/glassToast'
import './index.css'

const iconMap = {
  success: '✓',
  error: '✕',
  warning: '!',
  info: 'i'
}

const trimToasts = (list, maxCount) => {
  if (list.length <= maxCount) return list
  return list.slice(list.length - maxCount)
}

export default function GlassToastHost() {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef(new Map())

  useEffect(() => {
    if (process.env.TARO_ENV !== 'h5') return undefined

    const clearTimer = (id) => {
      const item = timersRef.current.get(id)
      if (!item) return
      clearTimeout(item.leaveTimer)
      clearTimeout(item.removeTimer)
      timersRef.current.delete(id)
    }

    const scheduleToast = (id, duration) => {
      const leaveDelay = Math.max(320, duration - 220)
      const leaveTimer = setTimeout(() => {
        setToasts((prev) => prev.map((toast) => (
          toast.id === id ? { ...toast, leaving: true } : toast
        )))
      }, leaveDelay)

      const removeTimer = setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id))
        clearTimer(id)
      }, duration)

      timersRef.current.set(id, { leaveTimer, removeTimer })
    }

    const handleToast = (payload = {}) => {
      const id = payload.id || `${Date.now()}-${Math.random()}`
      const duration = Number.isFinite(Number(payload.duration)) ? Number(payload.duration) : 2200
      const title = typeof payload.title === 'string' ? payload.title.trim() : ''
      if (!title) return
      const type = payload.type || 'info'

      setToasts((prev) => trimToasts([...prev, { id, title, type, leaving: false }], 4))
      scheduleToast(id, duration)
    }

    const unsubscribe = subscribeGlassToast(handleToast)

    return () => {
      unsubscribe()
      timersRef.current.forEach((item) => {
        clearTimeout(item.leaveTimer)
        clearTimeout(item.removeTimer)
      })
      timersRef.current.clear()
    }
  }, [])

  if (process.env.TARO_ENV !== 'h5') return null

  return (
    <View className='glass-toast-container'>
      {toasts.map((toast) => (
        <View
          key={toast.id}
          className={`glass-toast glass-toast-${toast.type}${toast.leaving ? ' glass-toast-leave' : ' glass-toast-enter'}`}
        >
          <View className='glass-toast-icon'>
            <Text>{iconMap[toast.type] || iconMap.info}</Text>
          </View>
          <Text className='glass-toast-content'>{toast.title}</Text>
        </View>
      ))}
    </View>
  )
}
