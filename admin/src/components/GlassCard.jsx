import './GlassUI.css'

// Pure glass card without Ant Design dependency.
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

