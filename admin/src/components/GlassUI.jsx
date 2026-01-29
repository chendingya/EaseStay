import { Card, message as antdMessage } from 'antd'
import { createRoot } from 'react-dom/client'
import './GlassUI.css'

// 玻璃卡片组件
export function GlassCard({ children, title, style, bodyStyle, ...props }) {
  return (
    <Card
      title={title}
      className="glass-card-component"
      style={style}
      bodyStyle={bodyStyle}
      {...props}
    >
      {children}
    </Card>
  )
}

// 玻璃消息容器
let messageContainer = null
let messageRoot = null

const getMessageContainer = () => {
  if (!messageContainer) {
    messageContainer = document.createElement('div')
    messageContainer.className = 'glass-message-container'
    document.body.appendChild(messageContainer)
    messageRoot = createRoot(messageContainer)
  }
  return { container: messageContainer, root: messageRoot }
}

// 玻璃消息组件
function GlassMessage({ type, content, onClose }) {
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  }

  const colors = {
    success: '#52c41a',
    error: '#ff4d4f',
    warning: '#faad14',
    info: '#1890ff'
  }

  return (
    <div className="glass-message" style={{ '--accent-color': colors[type] }}>
      <span className="glass-message-icon" style={{ color: colors[type] }}>
        {icons[type]}
      </span>
      <span className="glass-message-content">{content}</span>
    </div>
  )
}

// 显示玻璃消息
const showGlassMessage = (type, content, duration = 3) => {
  const { container } = getMessageContainer()
  
  const messageEl = document.createElement('div')
  messageEl.className = 'glass-message-wrapper'
  container.appendChild(messageEl)
  
  const root = createRoot(messageEl)
  root.render(<GlassMessage type={type} content={content} />)

  // 入场动画
  requestAnimationFrame(() => {
    messageEl.classList.add('glass-message-enter')
  })

  // 自动关闭
  setTimeout(() => {
    messageEl.classList.add('glass-message-leave')
    setTimeout(() => {
      root.unmount()
      messageEl.remove()
    }, 300)
  }, duration * 1000)
}

// 导出玻璃消息 API
export const glassMessage = {
  success: (content, duration) => showGlassMessage('success', content, duration),
  error: (content, duration) => showGlassMessage('error', content, duration),
  warning: (content, duration) => showGlassMessage('warning', content, duration),
  info: (content, duration) => showGlassMessage('info', content, duration)
}

// 也导出原始 message 以便需要时使用
export { antdMessage as message }
