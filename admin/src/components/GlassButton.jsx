import './GlassUI.css'

// Pure glass button without Ant Design dependency.
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

