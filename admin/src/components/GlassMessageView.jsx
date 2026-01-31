import './GlassUI.css'

export default function GlassMessageView({ type, content }) {
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
