const FONT = "500 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

const getWeightedCharWidth = (char) => {
  if (/\s/.test(char)) return 4
  if (/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(char)) return 12
  if (/[A-Z]/.test(char)) return 8.4
  if (/[a-z0-9]/.test(char)) return 7
  return 8
}

export const measureTextWidth = (text = '', font = FONT) => {
  const normalized = String(text || '')
  if (!normalized) return 0

  if (typeof document !== 'undefined') {
    const canvas = measureTextWidth._canvas || (measureTextWidth._canvas = document.createElement('canvas'))
    const context = canvas.getContext('2d')
    if (context) {
      context.font = font
      return Math.ceil(context.measureText(normalized).width)
    }
  }

  return Math.ceil([...normalized].reduce((sum, char) => sum + getWeightedCharWidth(char), 0))
}

const estimateActionItemWidth = (label, { minItemWidth, maxItemWidth, horizontalPadding, font }) => {
  const textWidth = measureTextWidth(label, font)
  const estimated = textWidth + horizontalPadding
  return Math.max(minItemWidth, Math.min(maxItemWidth, estimated))
}

export const estimateActionColumnWidth = (actionRows = [], options = {}) => {
  const {
    minColumnWidth = 160,
    maxColumnWidth = 560,
    minItemWidth = 56,
    maxItemWidth = 220,
    horizontalPadding = 24,
    itemGap = 8,
    cellPadding = 20,
    font = FONT
  } = options

  if (!Array.isArray(actionRows) || actionRows.length === 0) {
    return minColumnWidth
  }

  const widestRow = actionRows.reduce((widest, row) => {
    const labels = Array.isArray(row) ? row.filter(Boolean) : []
    if (!labels.length) {
      return Math.max(widest, minColumnWidth)
    }

    const contentWidth = labels.reduce((sum, label) => {
      return sum + estimateActionItemWidth(label, { minItemWidth, maxItemWidth, horizontalPadding, font })
    }, 0)

    const rowWidth = contentWidth + itemGap * Math.max(labels.length - 1, 0) + cellPadding
    return Math.max(widest, rowWidth)
  }, minColumnWidth)

  return Math.max(minColumnWidth, Math.min(maxColumnWidth, Math.ceil(widestRow)))
}
