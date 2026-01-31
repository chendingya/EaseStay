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

