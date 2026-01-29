const supabase = require('../config/supabase')

const renderStatusPage = async (req, res) => {
  try {
    // 从数据库获取酒店统计
    const { data: hotels, error } = await supabase
      .from('hotels')
      .select('status')

    const hotelCounts = (hotels || []).reduce((acc, item) => {
      acc.total += 1
      if (item.status === 'pending') acc.pending += 1
      if (item.status === 'approved') acc.approved += 1
      if (item.status === 'offline') acc.offline += 1
      if (item.status === 'rejected') acc.rejected += 1
      return acc
    }, { total: 0, pending: 0, approved: 0, offline: 0, rejected: 0 })

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>易宿状态页</title>
          <style>
            body { font-family: Arial, sans-serif; background: #f6f8fb; margin: 0; }
            .wrap { max-width: 920px; margin: 40px auto; padding: 24px; background: #fff; border-radius: 16px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); }
            h1 { margin: 0 0 12px; }
            .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-top: 16px; }
            .card { background: #f9fbff; border: 1px solid #e6ebf5; border-radius: 12px; padding: 16px; text-align: center; }
            .label { color: #64748b; font-size: 12px; margin-bottom: 6px; }
            .value { font-size: 20px; font-weight: 600; color: #0f172a; }
            .meta { margin-top: 16px; color: #64748b; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="wrap">
            <h1>易宿平台状态页</h1>
            <div>服务状态：<strong>OK</strong></div>
            <div class="grid">
              <div class="card"><div class="label">酒店总数</div><div class="value">${hotelCounts.total}</div></div>
              <div class="card"><div class="label">待审核</div><div class="value">${hotelCounts.pending}</div></div>
              <div class="card"><div class="label">已上架</div><div class="value">${hotelCounts.approved}</div></div>
              <div class="card"><div class="label">已下线</div><div class="value">${hotelCounts.offline}</div></div>
              <div class="card"><div class="label">已驳回</div><div class="value">${hotelCounts.rejected}</div></div>
            </div>
            <div class="meta">更新时间：${new Date().toISOString()}</div>
          </div>
        </body>
      </html>
    `
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(html)
  } catch (err) {
    res.status(500).send('服务状态页加载失败')
  }
}

const health = (req, res) => {
  res.json({ status: 'ok' })
}

module.exports = {
  renderStatusPage,
  health
}
