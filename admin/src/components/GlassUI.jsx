import dayjs from 'dayjs'
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

export function GanttTimeline({
  items = [],
  getTitle = (item) => item?.title || item?.type || '优惠',
  getPeriods = (item) => item?.periods,
  formatAxisLabel = (value) => dayjs(value).format('YYYY-MM-DD'),
  minBarWidth = 0.04,
  rowHeight = 18,
  showMarkers = true,
  color = '#60a5fa',
  longTermColor = '#94a3b8'
}) {
  const list = Array.isArray(items) ? items : []
  const allPeriods = list.flatMap((item) => {
    const periods = Array.isArray(getPeriods(item)) ? getPeriods(item) : []
    return periods.map((period) => ({ start: period?.start, end: period?.end }))
  })
  let start = null
  let end = null
  allPeriods.forEach((period) => {
    const s = dayjs(period.start)
    const e = dayjs(period.end)
    if (s.isValid()) {
      if (!start || s.isBefore(start)) start = s
    }
    if (e.isValid()) {
      if (!end || e.isAfter(end)) end = e
    }
  })
  if (!start || !end || !start.isValid() || !end.isValid() || !end.isAfter(start)) {
    start = dayjs().startOf('day')
    end = dayjs().add(7, 'day').endOf('day')
  }
  const totalMs = Math.max(end.diff(start), 1)
  const rows = list.map((item) => {
    const rawPeriods = Array.isArray(getPeriods(item)) ? getPeriods(item) : []
    const periods = rawPeriods.length ? rawPeriods : [{ start: start.toISOString(), end: end.toISOString(), longTerm: true }]
    const bars = periods.map((period) => {
      const s = dayjs(period.start)
      const e = dayjs(period.end)
      const safeStart = s.isValid() ? s : start
      const safeEnd = e.isValid() && e.isAfter(safeStart) ? e : safeStart.add(1, 'hour')
      const rawLeft = safeStart.diff(start) / totalMs
      const rawWidth = safeEnd.diff(safeStart) / totalMs
      const left = Math.min(Math.max(0, rawLeft), 1)
      let width = Math.max(rawWidth, minBarWidth)
      if (left + width > 1) {
        width = Math.max(0, 1 - left)
      }
      const markerStart = Math.min(Math.max(0, rawLeft), 1)
      const markerEnd = Math.min(Math.max(0, rawLeft + rawWidth), 1)
      return {
        left,
        width,
        markerStart,
        markerEnd,
        longTerm: !!period.longTerm
      }
    })
    return { item, bars }
  })

  return (
    <div style={{ padding: '12px 12px 8px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 8 }}>
        <span>{formatAxisLabel(start)}</span>
        <span>{formatAxisLabel(end)}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((row, rowIndex) => (
          <div key={`gantt-row-${rowIndex}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 90, fontSize: 12, color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {getTitle(row.item)}
            </div>
            <div style={{ position: 'relative', flex: 1, height: rowHeight, background: '#e2e8f0', borderRadius: rowHeight / 2 }}>
              {row.bars.map((bar, barIndex) => (
                <div key={`gantt-bar-${rowIndex}-${barIndex}`}>
                  <div
                    style={{
                      position: 'absolute',
                      left: `${bar.left * 100}%`,
                      width: `${bar.width * 100}%`,
                      top: 2,
                      bottom: 2,
                      borderRadius: rowHeight / 2,
                      background: bar.longTerm ? longTermColor : color
                    }}
                  />
                  {showMarkers && (
                    <>
                      <span
                        style={{
                          position: 'absolute',
                          left: `${bar.markerStart * 100}%`,
                          top: (rowHeight - 8) / 2,
                          width: 6,
                          height: 6,
                          borderRadius: 6,
                          background: '#334155',
                          transform: 'translateX(-50%)'
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          left: `${bar.markerEnd * 100}%`,
                          top: (rowHeight - 8) / 2,
                          width: 6,
                          height: 6,
                          borderRadius: 6,
                          background: '#0f172a',
                          transform: 'translateX(-50%)'
                        }}
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

