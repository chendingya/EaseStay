import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Card, Col, Empty, Row, Space, Spin, Statistic, Typography } from 'antd'
import ReactECharts from 'echarts-for-react'
import { GlassButton } from '../components'
import { api } from '../services'

export default function OrderStats() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin-hotels')
  const [loading, setLoading] = useState(true)
  const [hotel, setHotel] = useState(null)
  const [orderStats, setOrderStats] = useState(null)

  useEffect(() => {
    if (!id) return
    const base = isAdmin ? '/api/admin/hotels' : '/api/merchant/hotels'
    const fetchData = async () => {
      setLoading(true)
      try {
        const [hotelData, statsData] = await Promise.all([
          api.get(`${base}/${id}`),
          api.get(`${base}/${id}/order-stats`)
        ])
        setHotel(hotelData)
        setOrderStats(statsData)
      } catch {
        navigate(isAdmin ? '/admin-hotels' : '/hotels')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id, isAdmin, navigate])

  const statusStats = useMemo(() => orderStats?.statusStats || [], [orderStats])
  const monthly = useMemo(() => orderStats?.monthly || [], [orderStats])
  const roomTypeSummary = useMemo(() => orderStats?.roomTypeSummary || [], [orderStats])
  const daily = useMemo(() => orderStats?.roomTypeDaily || [], [orderStats])

  const statusData = useMemo(
    () => statusStats.map((item) => ({
      name: String(item?.status ?? '未知'),
      value: Number(item?.count) || 0
    })),
    [statusStats]
  )

  const monthlyLabels = useMemo(() => monthly.map((item) => item?.month || '-'), [monthly])
  const monthlyRevenue = useMemo(() => monthly.map((item) => Number(item?.revenue) || 0), [monthly])

  const roomTypeTop = useMemo(() => {
    const list = [...roomTypeSummary]
    list.sort((a, b) => (Number(b?.revenue) || 0) - (Number(a?.revenue) || 0))
    return list.slice(0, 8)
  }, [roomTypeSummary])

  const roomTypeNames = useMemo(() => roomTypeTop.map((item) => item?.roomTypeName || '未知'), [roomTypeTop])
  const roomTypeNights = useMemo(() => roomTypeTop.map((item) => Number(item?.nights) || 0), [roomTypeTop])
  const roomTypeRevenue = useMemo(() => roomTypeTop.map((item) => Number(item?.revenue) || 0), [roomTypeTop])

  const dailyTotals = useMemo(() => {
    const map = new Map()
    daily.forEach((item) => {
      const date = item?.date
      if (!date) return
      const current = map.get(date) || { nights: 0, revenue: 0 }
      current.nights += Number(item?.nights) || 0
      current.revenue += Number(item?.revenue) || 0
      map.set(date, current)
    })
    return Array.from(map.entries())
      .map(([date, value]) => ({ date, ...value }))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
  }, [daily])

  const dailyDates = useMemo(() => dailyTotals.map((item) => item.date), [dailyTotals])
  const dailyRevenue = useMemo(() => dailyTotals.map((item) => item.revenue), [dailyTotals])

  const statusOption = useMemo(() => ({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        type: 'pie',
        radius: ['35%', '70%'],
        data: statusData,
        label: { formatter: '{b} {d}%' }
      }
    ]
  }), [statusData])

  const monthlyOption = useMemo(() => ({
    grid: { left: 40, right: 20, top: 30, bottom: 40 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: monthlyLabels, axisLabel: { rotate: 30 } },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: monthlyRevenue, itemStyle: { color: '#1677ff' } }]
  }), [monthlyLabels, monthlyRevenue])

  const roomTypeOption = useMemo(() => ({
    grid: { left: 40, right: 40, top: 40, bottom: 40 },
    tooltip: { trigger: 'axis' },
    legend: { data: ['入住间夜', '收入'], top: 0 },
    xAxis: { type: 'category', data: roomTypeNames, axisLabel: { rotate: 20 } },
    yAxis: [
      { type: 'value', name: '入住间夜' },
      { type: 'value', name: '收入' }
    ],
    series: [
      { name: '入住间夜', type: 'bar', data: roomTypeNights, barMaxWidth: 28 },
      { name: '收入', type: 'line', yAxisIndex: 1, data: roomTypeRevenue }
    ]
  }), [roomTypeNames, roomTypeNights, roomTypeRevenue])

  const dailyOption = useMemo(() => ({
    grid: { left: 40, right: 20, top: 30, bottom: 40 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: dailyDates, axisLabel: { rotate: 30 } },
    yAxis: { type: 'value' },
    series: [{ type: 'line', data: dailyRevenue, areaStyle: { opacity: 0.2 } }]
  }), [dailyDates, dailyRevenue])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    )
  }

  const totalOrders = orderStats?.totalOrders || 0
  const revenue = orderStats?.revenue || 0
  const statusKinds = statusStats.length
  const roomTypeCount = roomTypeSummary.length
  const detailPath = isAdmin ? `/admin-hotels/${id}` : `/hotels/${id}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>订单统计</Typography.Title>
          <Typography.Text type="secondary">{hotel?.name || `酒店 ${id}`}</Typography.Text>
        </div>
        <Space>
          <GlassButton onClick={() => navigate(detailPath)}>返回详情</GlassButton>
        </Space>
      </div>

      <Card>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic title="订单总量" value={totalOrders} />
          </Col>
          <Col span={6}>
            <Statistic title="订单收入" value={revenue} prefix="¥" />
          </Col>
          <Col span={6}>
            <Statistic title="状态种类" value={statusKinds} />
          </Col>
          <Col span={6}>
            <Statistic title="房型数" value={roomTypeCount} />
          </Col>
        </Row>
      </Card>

      <Row gutter={24}>
        <Col span={12}>
          <Card title="订单状态分布">
            {statusData.length ? (
              <ReactECharts option={statusOption} style={{ height: 300 }} />
            ) : (
              <Empty description="暂无状态统计" />
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="月度收入">
            {monthlyRevenue.length ? (
              <ReactECharts option={monthlyOption} style={{ height: 300 }} />
            ) : (
              <Empty description="暂无月度统计" />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col span={12}>
          <Card title="房型表现（入住间夜/收入）">
            {roomTypeNames.length ? (
              <ReactECharts option={roomTypeOption} style={{ height: 300 }} />
            ) : (
              <Empty description="暂无房型统计" />
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="日度收入趋势">
            {dailyDates.length ? (
              <ReactECharts option={dailyOption} style={{ height: 300 }} />
            ) : (
              <Empty description="暂无日度统计" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
