import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Card, Col, Empty, Row, Space, Spin, Statistic, Typography } from 'antd'
import ReactECharts from 'echarts-for-react'
import { GlassButton } from '../components'
import { api } from '../services'
import { useTranslation } from 'react-i18next'

export default function OrderStats() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
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
      name: String(item?.status ?? t('orderStats.unknownStatus')),
      value: Number(item?.count) || 0
    })),
    [statusStats, t]
  )

  const monthlyLabels = useMemo(() => monthly.map((item) => item?.month || '-'), [monthly])
  const monthlyRevenue = useMemo(() => monthly.map((item) => Number(item?.revenue) || 0), [monthly])

  const roomTypeTop = useMemo(() => {
    const list = [...roomTypeSummary]
    list.sort((a, b) => (Number(b?.revenue) || 0) - (Number(a?.revenue) || 0))
    return list.slice(0, 8)
  }, [roomTypeSummary])

  const roomTypeNames = useMemo(() => roomTypeTop.map((item) => item?.roomTypeName || t('orderStats.unknownRoomType')), [roomTypeTop, t])
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
    legend: { data: [t('orderStats.legend.nights'), t('orderStats.legend.revenue')], top: 0 },
    xAxis: { type: 'category', data: roomTypeNames, axisLabel: { rotate: 20 } },
    yAxis: [
      { type: 'value', name: t('orderStats.legend.nights') },
      { type: 'value', name: t('orderStats.legend.revenue') }
    ],
    series: [
      { name: t('orderStats.legend.nights'), type: 'bar', data: roomTypeNights, barMaxWidth: 28 },
      { name: t('orderStats.legend.revenue'), type: 'line', yAxisIndex: 1, data: roomTypeRevenue }
    ]
  }), [roomTypeNames, roomTypeNights, roomTypeRevenue, t])

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
          <Typography.Title level={4} style={{ margin: 0 }}>{t('orderStats.title')}</Typography.Title>
          <Typography.Text type="secondary">{hotel?.name || t('orderStats.fallbackHotelName', { id })}</Typography.Text>
        </div>
        <Space>
          <GlassButton onClick={() => navigate(detailPath)}>{t('orderStats.backDetail')}</GlassButton>
        </Space>
      </div>

      <Card>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic title={t('orderStats.summary.totalOrders')} value={totalOrders} />
          </Col>
          <Col span={6}>
            <Statistic title={t('orderStats.summary.revenue')} value={revenue} prefix="¥" />
          </Col>
          <Col span={6}>
            <Statistic title={t('orderStats.summary.statusKinds')} value={statusKinds} />
          </Col>
          <Col span={6}>
            <Statistic title={t('orderStats.summary.roomTypeCount')} value={roomTypeCount} />
          </Col>
        </Row>
      </Card>

      <Row gutter={24}>
        <Col span={12}>
          <Card title={t('orderStats.cards.status')}>
            {statusData.length ? (
              <ReactECharts option={statusOption} style={{ height: 300 }} />
            ) : (
              <Empty description={t('orderStats.empty.status')} />
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title={t('orderStats.cards.monthly')}>
            {monthlyRevenue.length ? (
              <ReactECharts option={monthlyOption} style={{ height: 300 }} />
            ) : (
              <Empty description={t('orderStats.empty.monthly')} />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col span={12}>
          <Card title={t('orderStats.cards.roomType')}>
            {roomTypeNames.length ? (
              <ReactECharts option={roomTypeOption} style={{ height: 300 }} />
            ) : (
              <Empty description={t('orderStats.empty.roomType')} />
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title={t('orderStats.cards.daily')}>
            {dailyDates.length ? (
              <ReactECharts option={dailyOption} style={{ height: 300 }} />
            ) : (
              <Empty description={t('orderStats.empty.daily')} />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
