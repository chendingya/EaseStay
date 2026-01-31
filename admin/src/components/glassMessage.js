import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import GlassMessageView from './GlassMessageView'

let messageContainer = null

const getMessageContainer = () => {
  if (!messageContainer) {
    messageContainer = document.createElement('div')
    messageContainer.className = 'glass-message-container'
    document.body.appendChild(messageContainer)
  }
  return messageContainer
}

const showGlassMessage = (type, content, duration = 3) => {
  const container = getMessageContainer()
  const messageEl = document.createElement('div')
  messageEl.className = 'glass-message-wrapper'
  container.appendChild(messageEl)

  const root = createRoot(messageEl)
  root.render(createElement(GlassMessageView, { type, content }))

  requestAnimationFrame(() => {
    messageEl.classList.add('glass-message-enter')
  })

  setTimeout(() => {
    messageEl.classList.add('glass-message-leave')
    setTimeout(() => {
      root.unmount()
      messageEl.remove()
    }, 300)
  }, duration * 1000)
}

export const glassMessage = {
  success: (content, duration) => showGlassMessage('success', content, duration),
  error: (content, duration) => showGlassMessage('error', content, duration),
  warning: (content, duration) => showGlassMessage('warning', content, duration),
  info: (content, duration) => showGlassMessage('info', content, duration)
}
