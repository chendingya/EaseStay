import { DatePicker, Form, InputNumber, Modal, Radio, Select, Space, Table, Typography } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassButton, TableFilterBar, glassMessage as message } from './index.js'
import { api } from '../services'

export default function DashboardBatchModals({ mode, role, hotels, hotelsLoading = false, onClose }) {
  const { t } = useTranslation()
  const [selectedHotels, setSelectedHotels] = useState([])
  const [discountForm] = Form.useForm()
  const [roomForm] = Form.useForm()
  const [batchLoading, setBatchLoading] = useState(false)
  const [roomTypeStats, setRoomTypeStats] = useState([])
  const [statsLoading, setStatsLoading] = useState(false)
  const [discountHotelSearch, setDiscountHotelSearch] = useState('')
  const [discountCityFilter, setDiscountCityFilter] = useState('all')

  const isDiscountModalOpen = mode === 'discount'
  const isRoomModalOpen = mode === 'room'
  const discountScope = Form.useWatch('scope', discountForm)
  const discountRoomType = Form.useWatch('roomTypeName', discountForm)
  const roomTypeName = Form.useWatch('roomTypeName', roomForm)

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
    if (!isDiscountModalOpen && !isRoomModalOpen) return
    const approvedHotels = hotels.filter((hotel) => hotel.status === 'approved')
    const scopeHotels = discountScope === 'selected' || isRoomModalOpen
      ? approvedHotels.filter((hotel) => selectedHotels.includes(hotel.id))
      : approvedHotels
    fetchRoomTypeStats(scopeHotels.map((hotel) => hotel.id))
  }, [isDiscountModalOpen, isRoomModalOpen, discountScope, selectedHotels, hotels, fetchRoomTypeStats])

  const getRoomStats = (name) => roomTypeStats.find((item) => item.name === name)
  const approvedHotels = useMemo(
    () => hotels.filter((hotel) => hotel.status === 'approved'),
    [hotels]
  )

  const discountCityOptions = useMemo(() => {
    const cities = [...new Set(approvedHotels.map((hotel) => hotel.city).filter(Boolean))]
    return [
      { value: 'all', label: t('dashboard.batchDiscount.filterAllCities') },
      ...cities.map((city) => ({ value: city, label: city }))
    ]
  }, [approvedHotels, t])

  const filteredDiscountHotels = useMemo(() => {
    const keyword = discountHotelSearch.trim().toLowerCase()
    return approvedHotels.filter((hotel) => {
      const matchKeyword = !keyword ||
        String(hotel.name || '').toLowerCase().includes(keyword) ||
        String(hotel.name_en || '').toLowerCase().includes(keyword) ||
        String(hotel.address || '').toLowerCase().includes(keyword)
      const matchCity = discountCityFilter === 'all' || hotel.city === discountCityFilter
      return matchKeyword && matchCity
    })
  }, [approvedHotels, discountCityFilter, discountHotelSearch])

  const hotelColumns = useMemo(() => ([
    { title: t('dashboard.hotelTable.name'), dataIndex: 'name', key: 'name' },
    { title: t('dashboard.hotelTable.city'), dataIndex: 'city', key: 'city' },
    {
      title: t('dashboard.hotelTable.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => (status === 'approved' ? t('status.approved') : status === 'pending' ? t('status.pending') : t('status.offline'))
    }
  ]), [t])

  const rowSelection = useMemo(() => ({
    selectedRowKeys: selectedHotels,
    preserveSelectedRowKeys: true,
    onChange: (keys) => setSelectedHotels(keys)
  }), [selectedHotels])

  const handleResetDiscountFilters = () => {
    setDiscountHotelSearch('')
    setDiscountCityFilter('all')
  }

  const handleBatchDiscount = async () => {
    try {
      const values = await discountForm.validateFields()
      setBatchLoading(true)

      const targetHotels = values.scope === 'all'
        ? hotels.filter((hotel) => hotel.status === 'approved')
        : hotels.filter((hotel) => selectedHotels.includes(hotel.id))

      if (targetHotels.length === 0) {
        message.warning(t('dashboard.batchDiscount.noTargetWarning'))
        return
      }

      const base = role === 'admin' ? '/api/admin/hotels' : '/api/merchant/hotels'
      const isCancel = values.action === 'cancel'
      const finalDiscount = isCancel
        ? 0
        : values.discountType === 'rate'
          ? values.discount
          : -Math.abs(values.amount)
      const periods = Array.isArray(values.periods) && values.periods.length === 2
        ? [{ start: values.periods[0].toISOString(), end: values.periods[1].toISOString() }]
        : []

      const data = await api.post(`${base}/batch-discount`, {
        hotelIds: targetHotels.map((hotel) => hotel.id),
        roomTypeName: values.roomTypeName,
        quantity: isCancel ? 0 : values.quantity,
        discount: finalDiscount,
        periods
      })
      message.success(
        t('dashboard.batchDiscount.success', {
          count: data.successCount || 0,
          action: isCancel ? t('dashboard.batchDiscount.successActionCancel') : t('dashboard.batchDiscount.successActionSet')
        })
      )
      onClose()
    } catch (error) {
      console.error(error)
      message.error(t('dashboard.batchDiscount.error'))
    } finally {
      setBatchLoading(false)
    }
  }

  const handleBatchRoom = async () => {
    try {
      const values = await roomForm.validateFields()
      setBatchLoading(true)

      const targetHotels = hotels.filter((hotel) => selectedHotels.includes(hotel.id))
      if (targetHotels.length === 0) {
        message.warning(t('dashboard.batchRoom.noTargetWarning'))
        return
      }

      const base = role === 'admin' ? '/api/admin/hotels' : '/api/merchant/hotels'
      const payload = {
        hotelIds: targetHotels.map((hotel) => hotel.id),
        roomTypeName: values.roomTypeName,
        action: values.action,
        stock: values.stock
      }
      const data = await api.post(`${base}/batch-room`, payload)
      message.success(t('dashboard.batchRoom.success', { count: data.successCount || 0 }))
      onClose()
    } catch (error) {
      console.error(error)
      message.error(t('dashboard.batchRoom.error'))
    } finally {
      setBatchLoading(false)
    }
  }

  return (
    <>
      <Modal
        title={t('dashboard.batchDiscount.title')}
        open={isDiscountModalOpen}
        onCancel={onClose}
        footer={null}
        width={700}
      >
        <Form form={discountForm} layout="vertical" initialValues={{ scope: 'all', discount: 9, action: 'set', discountType: 'rate', amount: 50 }}>
          <Form.Item name="scope" label={t('dashboard.batchDiscount.scopeLabel')}>
            <Select
              options={[
                { value: 'all', label: t('dashboard.batchDiscount.scopeAll') },
                { value: 'selected', label: t('dashboard.batchDiscount.scopeSelected') }
              ]}
            />
          </Form.Item>

          <Form.Item name="action" label={t('dashboard.batchDiscount.actionLabel')} rules={[{ required: true, message: t('dashboard.batchDiscount.actionRequired') }]}>
            <Select
              options={[
                { value: 'set', label: t('dashboard.batchDiscount.actionSet') },
                { value: 'cancel', label: t('dashboard.batchDiscount.actionCancel') }
              ]}
            />
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.scope !== cur.scope}>
            {({ getFieldValue }) => getFieldValue('scope') === 'selected' && (
              <Form.Item label={t('dashboard.batchDiscount.hotelSelectLabel')}>
                <TableFilterBar
                  searchPlaceholder={t('dashboard.batchDiscount.filterSearchPlaceholder')}
                  searchValue={discountHotelSearch}
                  onSearchChange={setDiscountHotelSearch}
                  filterItems={[
                    {
                      key: 'city',
                      value: discountCityFilter,
                      onChange: setDiscountCityFilter,
                      options: discountCityOptions
                    }
                  ]}
                  summaryNode={
                    <Typography.Text type="secondary">
                      {t('dashboard.batchDiscount.selectedHotelsText', { count: selectedHotels.length })}
                    </Typography.Text>
                  }
                  onReset={handleResetDiscountFilters}
                  resetText={t('common.reset')}
                />
                <Table
                  rowSelection={rowSelection}
                  columns={hotelColumns}
                  dataSource={filteredDiscountHotels}
                  rowKey="id"
                  loading={hotelsLoading}
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
              return <Typography.Text type="secondary">{t('dashboard.batchDiscount.statsText', { used: stats.used, available: stats.available })}</Typography.Text>
            }}
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.action !== cur.action || prev.discountType !== cur.discountType}>
            {({ getFieldValue }) => getFieldValue('action') !== 'cancel' && (
              <>
                <Form.Item name="quantity" label={t('dashboard.batchDiscount.quantityLabel')} rules={[{ required: true }]}>
                  <InputNumber
                    min={1}
                    style={{ width: 150 }}
                    formatter={(value) => (value === undefined || value === null || value === '' ? '' : t('dashboard.batchDiscount.roomUnit', { value }))}
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
                      formatter={(value) => (value === undefined || value === null || value === '' ? '' : t('dashboard.batchDiscount.rateUnit', { value }))}
                      parser={(value) => value?.replace(/[^\d.]/g, '')}
                    />
                  </Form.Item>
                ) : (
                  <Form.Item name="amount" label={t('dashboard.batchDiscount.amountLabel')} rules={[{ required: true }]}>
                    <InputNumber
                      min={1}
                      style={{ width: 150 }}
                      formatter={(value) => (value === undefined || value === null || value === '' ? '' : t('dashboard.batchDiscount.amountUnit', { value }))}
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
              <GlassButton type="primary" loading={batchLoading} disabled={hotelsLoading} onClick={handleBatchDiscount}>
                {t('dashboard.batchDiscount.confirm')}
              </GlassButton>
              <GlassButton onClick={onClose}>{t('dashboard.batchDiscount.cancel')}</GlassButton>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('dashboard.batchRoom.title')}
        open={isRoomModalOpen}
        onCancel={onClose}
        footer={null}
        width={700}
      >
        <Form form={roomForm} layout="vertical" initialValues={{ action: 'offline' }}>
          <Form.Item label={t('dashboard.batchRoom.hotelSelectLabel')} required>
            <Table
              rowSelection={rowSelection}
              columns={hotelColumns}
              dataSource={hotels.filter((hotel) => hotel.status === 'approved')}
              rowKey="id"
              loading={hotelsLoading}
              size="small"
              pagination={{ pageSize: 5 }}
            />
            {selectedHotels.length > 0 && (
              <Typography.Text type="secondary">{t('dashboard.batchRoom.selectedHotelsText', { count: selectedHotels.length })}</Typography.Text>
            )}
          </Form.Item>

          <Form.Item name="action" label={t('dashboard.batchRoom.actionLabel')}>
            <Select
              options={[
                { value: 'offline', label: t('dashboard.batchRoom.actionOffline') },
                { value: 'adjust_stock', label: t('dashboard.batchRoom.actionAdjustStock') }
              ]}
            />
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
              return <Typography.Text type="secondary">{t('dashboard.batchRoom.statsText', { used: stats.used, available: stats.available })}</Typography.Text>
            }}
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.action !== cur.action}>
            {({ getFieldValue }) => getFieldValue('action') === 'adjust_stock' && (
              <Form.Item name="stock" label={t('dashboard.batchRoom.stockLabel')} rules={[{ required: true }]}>
                <InputNumber
                  min={0}
                  style={{ width: 150 }}
                  formatter={(value) => (value === undefined || value === null || value === '' ? '' : t('dashboard.batchRoom.roomUnit', { value }))}
                  parser={(value) => value?.replace(/[^\d]/g, '')}
                />
              </Form.Item>
            )}
          </Form.Item>

          <Form.Item>
            <Space>
              <GlassButton type="primary" loading={batchLoading} disabled={hotelsLoading} onClick={handleBatchRoom}>
                {t('dashboard.batchRoom.confirm')}
              </GlassButton>
              <GlassButton onClick={onClose}>{t('dashboard.batchRoom.cancel')}</GlassButton>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
