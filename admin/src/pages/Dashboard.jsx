import { Card, Col, Row, Statistic, Space, Typography, Modal, Form, InputNumber, Select, Table, Progress, Radio, DatePicker } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PercentageOutlined, EditOutlined, ShopOutlined } from '@ant-design/icons'
import { GlassButton, glassMessage as message } from '../components'
import { api } from '../services'
import { useTranslation } from 'react-i18next'

export default function Dashboard() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [stats, setStats] = useState({ pending: 0, approved: 0, offline: 0, total: 0 })
  const [loading, setLoading] = useState(false)
  const [hotels, setHotels] = useState([])
  const role = localStorage.getItem('role')

  // 批量操作状态
  const [discountModal, setDiscountModal] = useState(false)
  const [roomModal, setRoomModal] = useState(false)
  const [selectedHotels, setSelectedHotels] = useState([])
  const [discountForm] = Form.useForm()
  const [roomForm] = Form.useForm()
  const [batchLoading, setBatchLoading] = useState(false)
  const [roomTypeStats, setRoomTypeStats] = useState([])
  const [statsLoading, setStatsLoading] = useState(false)
  const [overview, setOverview] = useState(null)
  const [overviewLoading, setOverviewLoading] = useState(false)

  const discountScope = Form.useWatch('scope', discountForm)
  const discountRoomType = Form.useWatch('roomTypeName', discountForm)
  const roomTypeName = Form.useWatch('roomTypeName', roomForm)

  const fetchOverview = useCallback(async () => {
    if (role !== 'merchant') return
    setOverviewLoading(true)
    try {
      const data = await api.get('/api/merchant/hotels/overview')
      setOverview(data)
    } catch (error) {
      console.error(error)
    } finally {
      setOverviewLoading(false)
    }
  }, [role])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const url = role === 'admin' ? '/api/admin/hotels' : '/api/merchant/hotels'
      const data = await api.get(url)
      setHotels(data)
      const counts = data.reduce((acc, item) => {
        acc.total += 1
        if (item.status === 'pending') acc.pending += 1
        if (item.status === 'approved') acc.approved += 1
        if (item.status === 'offline') acc.offline += 1
        return acc
      }, { pending: 0, approved: 0, offline: 0, total: 0 })
      setStats(counts)
      await fetchOverview()
    } finally { setLoading(false) }
  }, [fetchOverview, role])

  const fetchRoomTypeStats = useCallback(async (hotelIds) => {
    if (!hotelIds.length) {
      setRoomTypeStats([])
      return
    }
    setStatsLoading(true)
    try {
      const base = role === 'admin' ? '/api/admin/hotels' : '/api/merchant/hotels'
      const query = `?hotelIds=${hotelIds.join(',')}`
      const data = await api.get(`${base}/room-type-stats${query}`)
      setRoomTypeStats(data || [])
    } catch (error) {
      console.error(error)
    } finally {
      setStatsLoading(false)
    }
  }, [role])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!discountModal && !roomModal) return
    const approvedHotels = hotels.filter((h) => h.status === 'approved')
    const scopeHotels = discountScope === 'selected' || roomModal
      ? approvedHotels.filter((h) => selectedHotels.includes(h.id))
      : approvedHotels
    fetchRoomTypeStats(scopeHotels.map((h) => h.id))
  }, [discountModal, roomModal, discountScope, selectedHotels, hotels, fetchRoomTypeStats])

  const getRoomStats = (name) => roomTypeStats.find((item) => item.name === name)

  // 批量设置折扣
  const handleBatchDiscount = async () => {
    try {
      const values = await discountForm.validateFields()
      setBatchLoading(true)
      
      const targetHotels = values.scope === 'all' 
        ? hotels.filter(h => h.status === 'approved')
        : hotels.filter(h => selectedHotels.includes(h.id))
      
      if (targetHotels.length === 0) {
        message.warning(t('dashboard.batchDiscount.noTargetWarning'))
        return
      }

      const base = role === 'admin' ? '/api/admin/hotels' : '/api/merchant/hotels'
      const isCancel = values.action === 'cancel'
      let finalDiscount = 0
      if (!isCancel) {
        finalDiscount = values.discountType === 'rate' ? values.discount : -Math.abs(values.amount)
      }
      const periods = Array.isArray(values.periods) && values.periods.length === 2
        ? [{ start: values.periods[0].toISOString(), end: values.periods[1].toISOString() }]
        : []

      const data = await api.post(`${base}/batch-discount`, {
        hotelIds: targetHotels.map((h) => h.id),
        roomTypeName: values.roomTypeName,
        quantity: isCancel ? 0 : values.quantity,
        discount: finalDiscount,
        periods
      })
      message.success(t('dashboard.batchDiscount.success', { count: data.successCount || 0, action: isCancel ? t('dashboard.batchDiscount.successActionCancel') : t('dashboard.batchDiscount.successActionSet') }))
      setDiscountModal(false)
      discountForm.resetFields()
      setSelectedHotels([])
      // 刷新数据
      fetchRoomTypeStats(targetHotels.map(h => h.id))
    } catch (error) {
      console.error(error)
      message.error(t('dashboard.batchDiscount.error'))
    } finally {
      setBatchLoading(false)
    }
  }

  // 批量房型操作
  const handleBatchRoom = async () => {
    try {
      const values = await roomForm.validateFields()
      setBatchLoading(true)
      
      const targetHotels = hotels.filter(h => selectedHotels.includes(h.id))
      
      if (targetHotels.length === 0) {
        message.warning(t('dashboard.batchRoom.noTargetWarning'))
        return
      }

      const base = role === 'admin' ? '/api/admin/hotels' : '/api/merchant/hotels'
      const payload = {
        hotelIds: targetHotels.map((h) => h.id),
        roomTypeName: values.roomTypeName,
        action: values.action,
        stock: values.stock
      }
      const data = await api.post(`${base}/batch-room`, payload)
      message.success(t('dashboard.batchRoom.success', { count: data.successCount || 0 }))
      
      setRoomModal(false)
      roomForm.resetFields()
      setSelectedHotels([])
      // 刷新数据
      fetchRoomTypeStats(hotels.map(h => h.id)) // 简单起见，刷新所有
    } catch (error) {
      console.error(error)
      message.error(t('dashboard.batchRoom.error'))
    } finally {
      setBatchLoading(false)
    }
  }

  // 酒店选择表格列
  const hotelColumns = [
    { title: t('dashboard.hotelTable.name'), dataIndex: 'name', key: 'name' },
    { title: t('dashboard.hotelTable.city'), dataIndex: 'city', key: 'city' },
    { title: t('dashboard.hotelTable.status'), dataIndex: 'status', key: 'status', render: (s) => s === 'approved' ? t('status.approved') : s === 'pending' ? t('status.pending') : t('status.offline') }
  ]

  const rowSelection = {
    selectedRowKeys: selectedHotels,
    onChange: (keys) => setSelectedHotels(keys)
  }

  const currentMonthLabel = t('dashboard.overview.monthlyRevenue', { month: new Date().getMonth() + 1 })
  const overviewStats = overview || {}
  const overviewHotelStats = overviewStats.hotelStats || []
  const overviewTotalRooms = overviewStats.totalRooms || 0
  const overviewRoomTypes = overviewStats.roomTypeCount || 0
  const overviewUsedRooms = overviewStats.usedRooms || 0
  const overviewAvailableRooms = overviewStats.availableRooms || 0
  const overviewOfflineRooms = overviewStats.offlineRooms || 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 24 }}>
      {role === 'merchant' && (
        <Card title={t('dashboard.overview.title')}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic title={t('dashboard.overview.totalRoomsTitle')} value={overviewTotalRooms} suffix={t('dashboard.overview.totalRoomsSuffix')} loading={overviewLoading} />
            </Col>
            <Col span={6}>
              <Statistic title={t('dashboard.overview.roomTypesTitle')} value={overviewRoomTypes} suffix={t('dashboard.overview.roomTypesSuffix')} loading={overviewLoading} />
            </Col>
            <Col span={6}>
              <Statistic title={currentMonthLabel} value={overviewStats.monthlyRevenue || 0} prefix="¥" loading={overviewLoading} />
            </Col>
            <Col span={6}>
              <Statistic title={t('dashboard.overview.hotelCountTitle')} value={overviewStats.totalHotels || 0} suffix={t('dashboard.overview.hotelCountSuffix')} loading={overviewLoading} />
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={8}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 12, borderRadius: 8, background: '#fafafa' }}>
                <Progress type="dashboard" percent={overviewStats.occupancyRate || 0} strokeColor="#faad14" size={84} />
                <div>
                  <Statistic title={t('dashboard.overview.occupancyRateTitle')} value={overviewStats.occupancyRate || 0} suffix="%" loading={overviewLoading} />
                  <Typography.Text type="secondary">{t('dashboard.overview.usedRoomsText', { count: overviewUsedRooms })}</Typography.Text>
                </div>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 12, borderRadius: 8, background: '#fafafa' }}>
                <Progress type="dashboard" percent={overviewStats.availableRate || 0} strokeColor="#52c41a" size={84} />
                <div>
                  <Statistic title={t('dashboard.overview.availableRateTitle')} value={overviewStats.availableRate || 0} suffix="%" loading={overviewLoading} />
                  <Typography.Text type="secondary">{t('dashboard.overview.availableRoomsText', { count: overviewAvailableRooms })}</Typography.Text>
                </div>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 12, borderRadius: 8, background: '#fafafa' }}>
                <Progress type="dashboard" percent={overviewStats.offlineRate || 0} strokeColor="#999" size={84} />
                <div>
                  <Statistic title={t('dashboard.overview.offlineRateTitle')} value={overviewStats.offlineRate || 0} suffix="%" loading={overviewLoading} />
                  <Typography.Text type="secondary">{t('dashboard.overview.offlineRoomsText', { count: overviewOfflineRooms })}</Typography.Text>
                </div>
              </div>
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={6}>
              <Statistic title={t('dashboard.stats.pending')} value={stats.pending} loading={loading} styles={{ content: { color: '#faad14' } }} suffix={t('dashboard.overview.hotelCountSuffix')} />
            </Col>
            <Col span={6}>
              <Statistic title={t('dashboard.stats.approved')} value={stats.approved} loading={loading} styles={{ content: { color: '#52c41a' } }} suffix={t('dashboard.overview.hotelCountSuffix')} />
            </Col>
            <Col span={6}>
              <Statistic title={t('dashboard.stats.offline')} value={stats.offline} loading={loading} styles={{ content: { color: '#999' } }} suffix={t('dashboard.overview.hotelCountSuffix')} />
            </Col>
          </Row>
        </Card>
      )}
      {/* 统计卡片 */}
      {role !== 'merchant' && (
        <Row gutter={16}>
          <Col span={6}>
            <Card><Statistic title={t('dashboard.stats.pending')} value={stats.pending} loading={loading} styles={{ content: { color: '#faad14' } }} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title={t('dashboard.stats.approved')} value={stats.approved} loading={loading} styles={{ content: { color: '#52c41a' } }} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title={t('dashboard.stats.offline')} value={stats.offline} loading={loading} styles={{ content: { color: '#999' } }} /></Card>
          </Col>
          {role === 'admin' && (
            <Col span={6}>
              <Card><Statistic title={t('dashboard.stats.total')} value={stats.total} loading={loading} /></Card>
            </Col>
          )}
        </Row>
      )}

      {role === 'merchant' && (
        <Card title={t('dashboard.distribution.title')} loading={overviewLoading}>
          <Table
            columns={[
              { title: t('dashboard.distribution.columns.hotel'), dataIndex: 'name', key: 'name' },
              { title: t('dashboard.distribution.columns.roomTypes'), dataIndex: 'roomTypeCount', key: 'roomTypeCount', width: 90 },
              { title: t('dashboard.distribution.columns.totalRooms'), dataIndex: 'totalRooms', key: 'totalRooms', width: 90 },
              { title: t('dashboard.distribution.columns.usedRooms'), dataIndex: 'usedRooms', key: 'usedRooms', width: 80 },
              { title: t('dashboard.distribution.columns.availableRooms'), dataIndex: 'availableRooms', key: 'availableRooms', width: 80 },
              {
                title: t('dashboard.distribution.columns.occupancy'),
                dataIndex: 'occupancyRate',
                key: 'occupancyRate',
                width: 160,
                render: (value) => <Progress percent={value || 0} size="small" />
              }
            ]}
            dataSource={overviewHotelStats}
            rowKey="hotelId"
            pagination={{ pageSize: 6 }}
            size="small"
          />
        </Card>
      )}

      {/* 快捷操作 */}
      <Card title={t('dashboard.quickActions.title')}>
        <Space wrap size={12}>
          {role === 'merchant' && (
            <GlassButton type="primary" icon={<ShopOutlined />} onClick={() => navigate('/hotels/new')}>
              {t('dashboard.quickActions.newHotel')}
            </GlassButton>
          )}
          {role === 'admin' && (
            <GlassButton type="primary" onClick={() => navigate('/audit')}>
              {t('dashboard.quickActions.pendingAudit')}
            </GlassButton>
          )}
          <GlassButton icon={<PercentageOutlined />} onClick={() => setDiscountModal(true)}>
            {t('dashboard.quickActions.batchDiscount')}
          </GlassButton>
          <GlassButton icon={<EditOutlined />} onClick={() => setRoomModal(true)}>
            {t('dashboard.quickActions.batchRoom')}
          </GlassButton>
        </Space>
      </Card>

      {/* 批量折扣弹窗 */}
      <Modal
        title={t('dashboard.batchDiscount.title')}
        open={discountModal}
        onCancel={() => setDiscountModal(false)}
        footer={null}
        width={700}
      >
        <Form form={discountForm} layout="vertical" initialValues={{ scope: 'all', discount: 9, action: 'set', discountType: 'rate', amount: 50 }}>
          <Form.Item name="scope" label={t('dashboard.batchDiscount.scopeLabel')}>
            <Select options={[
              { value: 'all', label: t('dashboard.batchDiscount.scopeAll') },
              { value: 'selected', label: t('dashboard.batchDiscount.scopeSelected') }
            ]} />
          </Form.Item>

          <Form.Item name="action" label={t('dashboard.batchDiscount.actionLabel')} rules={[{ required: true, message: t('dashboard.batchDiscount.actionRequired') }]}>
            <Select options={[
              { value: 'set', label: t('dashboard.batchDiscount.actionSet') },
              { value: 'cancel', label: t('dashboard.batchDiscount.actionCancel') }
            ]} />
          </Form.Item>
          
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.scope !== cur.scope}>
            {({ getFieldValue }) => getFieldValue('scope') === 'selected' && (
              <Form.Item label={t('dashboard.batchDiscount.hotelSelectLabel')}>
                <Table
                  rowSelection={rowSelection}
                  columns={hotelColumns}
                  dataSource={hotels.filter(h => h.status === 'approved')}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 5 }}
                />
              </Form.Item>
            )}
          </Form.Item>

          <Form.Item name="roomTypeName" label={t('dashboard.batchDiscount.roomTypeLabel')} rules={[{ required: true, message: t('dashboard.batchDiscount.roomTypeRequired') }]}>
            <Select
              placeholder={statsLoading ? t('dashboard.batchDiscount.roomTypePlaceholderLoading') : t('dashboard.batchDiscount.roomTypePlaceholderSelect')}
              options={roomTypeStats.map((item) => ({ value: item.name, label: item.name }))}
              loading={statsLoading}
              disabled={!roomTypeStats.length}
            />
          </Form.Item>

          <Form.Item shouldUpdate noStyle>
            {() => {
              const stats = getRoomStats(discountRoomType)
              if (!stats) return null
              return (
                <Typography.Text type="secondary">
                  {t('dashboard.batchDiscount.statsText', { used: stats.used, available: stats.available })}
                </Typography.Text>
              )
            }}
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.action !== cur.action || prev.discountType !== cur.discountType}>
            {({ getFieldValue }) => getFieldValue('action') !== 'cancel' && (
              <>
                <Form.Item name="quantity" label={t('dashboard.batchDiscount.quantityLabel')} rules={[{ required: true }]}>
                  <InputNumber
                    min={1}
                    style={{ width: 150 }}
                    formatter={(value) => value === undefined || value === null || value === '' ? '' : t('dashboard.batchDiscount.roomUnit', { value })}
                    parser={(value) => value?.replace(/[^\d]/g, '')}
                  />
                </Form.Item>

                <Form.Item name="discountType" label={t('dashboard.batchDiscount.discountTypeLabel')} rules={[{ required: true }]}>
                  <Radio.Group>
                    <Radio value="rate">{t('dashboard.batchDiscount.discountTypeRate')}</Radio>
                    <Radio value="amount">{t('dashboard.batchDiscount.discountTypeAmount')}</Radio>
                  </Radio.Group>
                </Form.Item>

                {getFieldValue('discountType') === 'rate' ? (
                  <Form.Item name="discount" label={t('dashboard.batchDiscount.rateLabel')} rules={[{ required: true }]}>
                    <InputNumber
                      min={0.1}
                      max={10}
                      step={0.5}
                      style={{ width: 150 }}
                      formatter={(value) => value === undefined || value === null || value === '' ? '' : t('dashboard.batchDiscount.rateUnit', { value })}
                      parser={(value) => value?.replace(/[^\d.]/g, '')}
                    />
                  </Form.Item>
                ) : (
                  <Form.Item name="amount" label={t('dashboard.batchDiscount.amountLabel')} rules={[{ required: true }]}>
                    <InputNumber
                      min={1}
                      style={{ width: 150 }}
                      formatter={(value) => value === undefined || value === null || value === '' ? '' : t('dashboard.batchDiscount.amountUnit', { value })}
                      parser={(value) => value?.replace(/[^\d]/g, '')}
                    />
                  </Form.Item>
                )}
                <Form.Item name="periods" label={t('dashboard.batchDiscount.periodsLabel')}>
                  <DatePicker.RangePicker showTime style={{ width: 360 }} />
                </Form.Item>
              </>
            )}
          </Form.Item>

          <Form.Item>
            <Space>
              <GlassButton type="primary" loading={batchLoading} onClick={handleBatchDiscount}>
                {t('dashboard.batchDiscount.confirm')}
              </GlassButton>
              <GlassButton onClick={() => setDiscountModal(false)}>{t('dashboard.batchDiscount.cancel')}</GlassButton>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量房型操作弹窗 */}
      <Modal
        title={t('dashboard.batchRoom.title')}
        open={roomModal}
        onCancel={() => setRoomModal(false)}
        footer={null}
        width={700}
      >
        <Form form={roomForm} layout="vertical" initialValues={{ action: 'offline' }}>
          <Form.Item label={t('dashboard.batchRoom.hotelSelectLabel')} required>
            <Table
              rowSelection={rowSelection}
              columns={hotelColumns}
              dataSource={hotels.filter(h => h.status === 'approved')}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 5 }}
            />
            {selectedHotels.length > 0 && (
              <Typography.Text type="secondary">{t('dashboard.batchRoom.selectedHotelsText', { count: selectedHotels.length })}</Typography.Text>
            )}
          </Form.Item>

          <Form.Item name="action" label={t('dashboard.batchRoom.actionLabel')}>
            <Select options={[
              { value: 'offline', label: t('dashboard.batchRoom.actionOffline') },
              { value: 'adjust_stock', label: t('dashboard.batchRoom.actionAdjustStock') }
            ]} />
          </Form.Item>

          <Form.Item name="roomTypeName" label={t('dashboard.batchRoom.roomTypeLabel')} rules={[{ required: true, message: t('dashboard.batchRoom.roomTypeRequired') }]}>
            <Select 
              placeholder={t('dashboard.batchRoom.roomTypePlaceholder')}
              options={roomTypeStats.map((item) => ({ value: item.name, label: item.name }))}
              loading={statsLoading}
              disabled={!roomTypeStats.length}
            />
          </Form.Item>

          <Form.Item shouldUpdate noStyle>
            {() => {
              const stats = getRoomStats(roomTypeName)
              if (!stats) return null
              return (
                <Typography.Text type="secondary">
                  {t('dashboard.batchRoom.statsText', { used: stats.used, available: stats.available })}
                </Typography.Text>
              )
            }}
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.action !== cur.action}>
            {({ getFieldValue }) => getFieldValue('action') === 'adjust_stock' && (
              <Form.Item name="stock" label={t('dashboard.batchRoom.stockLabel')} rules={[{ required: true }]}>
                <InputNumber
                  min={0}
                  style={{ width: 150 }}
                  formatter={(value) => value === undefined || value === null || value === '' ? '' : t('dashboard.batchRoom.roomUnit', { value })}
                  parser={(value) => value?.replace(/[^\d]/g, '')}
                />
              </Form.Item>
            )}
          </Form.Item>

          <Form.Item>
            <Space>
              <GlassButton type="primary" loading={batchLoading} onClick={handleBatchRoom}>
                {t('dashboard.batchRoom.confirm')}
              </GlassButton>
              <GlassButton onClick={() => setRoomModal(false)}>{t('dashboard.batchRoom.cancel')}</GlassButton>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

    </div>
  )
}
