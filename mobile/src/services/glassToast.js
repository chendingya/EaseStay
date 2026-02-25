import Taro from '@tarojs/taro'

const isH5 = process.env.TARO_ENV === 'h5'
let toastSeed = 0
const listeners = new Set()

const nextToastId = () => {
  toastSeed += 1
  return `${Date.now()}-${toastSeed}`
}

const normalizeDuration = (duration) => {
  const value = Number(duration)
  if (!Number.isFinite(value)) return 2200
  return Math.max(600, Math.round(value))
}

const normalizeTitle = (title) => {
  if (typeof title === 'string') return title.trim()
  if (title === null || title === undefined) return ''
  return String(title).trim()
}

const getNativeIcon = (type) => (type === 'success' ? 'success' : 'none')

export const subscribeGlassToast = (listener) => {
  if (typeof listener !== 'function') return () => {}
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const dispatchToast = (payload) => {
  if (isH5 && listeners.size > 0) {
    listeners.forEach((listener) => {
      try {
        listener(payload)
      } catch (error) {
        console.error('[glassToast] listener error', error)
      }
    })
    return
  }
  Taro.showToast({
    title: payload.title,
    icon: getNativeIcon(payload.type),
    duration: payload.duration
  })
}

const show = ({ title, type = 'info', duration } = {}) => {
  const safeTitle = normalizeTitle(title)
  if (!safeTitle) return
  dispatchToast({
    id: nextToastId(),
    title: safeTitle,
    type,
    duration: normalizeDuration(duration)
  })
}

const typed = (type) => (title, duration) => show({ title, type, duration })

export const glassToast = {
  show,
  success: typed('success'),
  error: typed('error'),
  warning: typed('warning'),
  info: typed('info')
}

export default glassToast
