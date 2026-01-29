import { createRoot } from 'react-dom/client'
import './GlassUI.css'

// 纯玻璃卡片组件 - 不依赖 Ant Design
export function GlassCard({ children, title, extra, style, bodyStyle, className = '', ...props }) {
  return (
    <div className={`glass-card ${className}`} style={style} {...props}>
      {(title || extra) && (
        <div className="glass-card-header">
          {title && <div className="glass-card-title">{title}</div>}
          {extra && <div className="glass-card-extra">{extra}</div>}
        </div>
      )}
      <div className="glass-card-body" style={bodyStyle}>
        {children}
      </div>
    </div>
  )
}

// 纯玻璃按钮组件 - 不依赖 Ant Design
export function GlassButton({ 
  children, 
  type = 'default', 
  size = 'middle',
  icon,
  loading = false,
  disabled = false,
  danger = false,
  block = false,
  htmlType = 'button',
  onClick,
  style,
  className = '',
  ...props 
}) {
  const sizeClass = size === 'small' ? 'glass-btn-sm' : size === 'large' ? 'glass-btn-lg' : ''
  const typeClass = type === 'primary' ? 'glass-btn-primary' : type === 'link' ? 'glass-btn-link' : ''
  const dangerClass = danger ? 'glass-btn-danger' : ''
  const blockClass = block ? 'glass-btn-block' : ''
  const disabledClass = (disabled || loading) ? 'glass-btn-disabled' : ''

  return (
    <button
      type={htmlType}
      className={`glass-btn ${sizeClass} ${typeClass} ${dangerClass} ${blockClass} ${disabledClass} ${className}`}
      style={style}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <span className="glass-btn-loading">⏳</span>}
      {icon && !loading && <span className="glass-btn-icon">{icon}</span>}
      {children && <span>{children}</span>}
    </button>
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
