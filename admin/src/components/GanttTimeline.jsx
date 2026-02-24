import dayjs from 'dayjs'

export function GanttTimeline({
  items = [],
  getTitle = (item) => item?.title || item?.type || 'Promotion',
  getPeriods = (item) => item?.periods,
  formatAxisLabel = (value) => dayjs(value).format('YYYY-MM-DD'),
  minBarWidth = 0,
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
  if (start && end && start.isValid() && end.isValid() && end.isAfter(start)) {
    start = start.startOf('day')
    end = end.endOf('day')
  } else {
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
      const safeEnd = e.isValid() ? e : safeStart
      const boundedStart = safeStart.isBefore(start) ? start : safeStart
      const boundedEnd = safeEnd.isAfter(end) ? end : safeEnd
      const rawLeft = safeStart.diff(start) / totalMs
      const rawRight = safeEnd.diff(start) / totalMs
      const left = Math.min(Math.max(0, boundedStart.diff(start) / totalMs), 1)
      let width = Math.max(boundedEnd.diff(boundedStart) / totalMs, 0)
      if (width === 0 && minBarWidth > 0) {
        width = minBarWidth
      }
      if (left + width > 1) {
        width = Math.max(0, 1 - left)
      }
      const markerStart = Math.min(Math.max(0, rawLeft), 1)
      const markerEnd = Math.min(Math.max(0, rawRight), 1)
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

