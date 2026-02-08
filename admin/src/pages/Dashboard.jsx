import { Card, Col, Row, Statistic, Space, Typography, Modal, Form, InputNumber, Select, Table, Progress, Radio } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PercentageOutlined, EditOutlined, ShopOutlined } from '@ant-design/icons'
import { GlassButton, glassMessage as message } from '../components'
import { api } from '../services/request'

export default function Dashboard() {
  const navigate = useNavigate()
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
      console.error('获取概览数据失败:', error)
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
      console.error('获取房型统计失败:', error)
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
        message.warning('没有可操作的酒店')
        return
      }

      const base = role === 'admin' ? '/api/admin/hotels' : '/api/merchant/hotels'
      const isCancel = values.action === 'cancel'
      let finalDiscount = 0
      if (!isCancel) {
        finalDiscount = values.discountType === 'rate' ? values.discount : -Math.abs(values.amount)
      }

      const data = await api.post(`${base}/batch-discount`, {
        hotelIds: targetHotels.map((h) => h.id),
        roomTypeName: values.roomTypeName,
        quantity: isCancel ? 0 : values.quantity,
        discount: finalDiscount
      })
      message.success(`已为 ${data.successCount || 0} 个房型${isCancel ? '取消折扣' : '设置折扣'}`)
      setDiscountModal(false)
      discountForm.resetFields()
      setSelectedHotels([])
      // 刷新数据
      fetchRoomTypeStats(targetHotels.map(h => h.id))
    } catch (error) {
      console.error('批量设置折扣失败:', error)
      message.error('批量设置折扣失败，请重试')
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
        message.warning('请先选择酒店')
        return
      }

      const base = role === 'admin' ? '/api/admin/hotels' : '/api/merchant/hotels'
      const data = await api.post(`${base}/batch-room`, {
        hotelIds: targetHotels.map((h) => h.id),
        roomTypeName: values.roomTypeName,
        action: values.action,
        quantity: values.quantity,
        stock: values.stock
      })
      message.success(`已处理 ${data.successCount || 0} 个房型`)
      
      setRoomModal(false)
      roomForm.resetFields()
      setSelectedHotels([])
      // 刷新数据
      fetchRoomTypeStats(hotels.map(h => h.id)) // 简单起见，刷新所有
    } catch (error) {
      console.error('批量房型操作失败:', error)
      message.error('批量房型操作失败，请重试')
    } finally {
      setBatchLoading(false)
    }
  }

  // 酒店选择表格列
  const hotelColumns = [
    { title: '酒店名称', dataIndex: 'name', key: 'name' },
    { title: '城市', dataIndex: 'city', key: 'city' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s) => s === 'approved' ? '已上架' : s === 'pending' ? '待审核' : '已下架' }
  ]

  const rowSelection = {
    selectedRowKeys: selectedHotels,
    onChange: (keys) => setSelectedHotels(keys)
  }

  const currentMonthLabel = `${new Date().getMonth() + 1}月收入`
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
        <Card title="商户经营总览">
          <Row gutter={16}>
            <Col span={6}>
              <Statistic title="总房间数" value={overviewTotalRooms} suffix="间" loading={overviewLoading} />
            </Col>
            <Col span={6}>
              <Statistic title="房型数" value={overviewRoomTypes} suffix="种" loading={overviewLoading} />
            </Col>
            <Col span={6}>
              <Statistic title={currentMonthLabel} value={overviewStats.monthlyRevenue || 0} prefix="¥" loading={overviewLoading} />
            </Col>
            <Col span={6}>
              <Statistic title="酒店数量" value={overviewStats.totalHotels || 0} suffix="家" loading={overviewLoading} />
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={8}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 12, borderRadius: 8, background: '#fafafa' }}>
                <Progress type="dashboard" percent={overviewStats.occupancyRate || 0} strokeColor="#faad14" size={84} />
                <div>
                  <Statistic title="入住率" value={overviewStats.occupancyRate || 0} suffix="%" loading={overviewLoading} />
                  <Typography.Text type="secondary">已使用 {overviewUsedRooms} 间</Typography.Text>
                </div>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 12, borderRadius: 8, background: '#fafafa' }}>
                <Progress type="dashboard" percent={overviewStats.availableRate || 0} strokeColor="#52c41a" size={84} />
                <div>
                  <Statistic title="空闲率" value={overviewStats.availableRate || 0} suffix="%" loading={overviewLoading} />
                  <Typography.Text type="secondary">空闲 {overviewAvailableRooms} 间</Typography.Text>
                </div>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 12, borderRadius: 8, background: '#fafafa' }}>
                <Progress type="dashboard" percent={overviewStats.offlineRate || 0} strokeColor="#999" size={84} />
                <div>
                  <Statistic title="下架率" value={overviewStats.offlineRate || 0} suffix="%" loading={overviewLoading} />
                  <Typography.Text type="secondary">已下架 {overviewOfflineRooms} 间</Typography.Text>
                </div>
              </div>
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={6}>
              <Statistic title="待审核酒店" value={stats.pending} loading={loading} styles={{ content: { color: '#faad14' } }} suffix="家" />
            </Col>
            <Col span={6}>
              <Statistic title="已上架酒店" value={stats.approved} loading={loading} styles={{ content: { color: '#52c41a' } }} suffix="家" />
            </Col>
            <Col span={6}>
              <Statistic title="已下架酒店" value={stats.offline} loading={loading} styles={{ content: { color: '#999' } }} suffix="家" />
            </Col>
          </Row>
        </Card>
      )}
      {/* 统计卡片 */}
      {role !== 'merchant' && (
        <Row gutter={16}>
          <Col span={6}>
            <Card><Statistic title="待审核酒店" value={stats.pending} loading={loading} styles={{ content: { color: '#faad14' } }} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="已上架酒店" value={stats.approved} loading={loading} styles={{ content: { color: '#52c41a' } }} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="已下架酒店" value={stats.offline} loading={loading} styles={{ content: { color: '#999' } }} /></Card>
          </Col>
          {role === 'admin' && (
            <Col span={6}>
              <Card><Statistic title="酒店总数" value={stats.total} loading={loading} /></Card>
            </Col>
          )}
        </Row>
      )}

      {role === 'merchant' && (
        <Card title="酒店入住率分布" loading={overviewLoading}>
          <Table
            columns={[
              { title: '酒店', dataIndex: 'name', key: 'name' },
              { title: '房型数', dataIndex: 'roomTypeCount', key: 'roomTypeCount', width: 90 },
              { title: '总房间', dataIndex: 'totalRooms', key: 'totalRooms', width: 90 },
              { title: '已用', dataIndex: 'usedRooms', key: 'usedRooms', width: 80 },
              { title: '空闲', dataIndex: 'availableRooms', key: 'availableRooms', width: 80 },
              {
                title: '入住率',
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
      <Card title="快捷操作">
        <Space wrap size={12}>
          {role === 'merchant' && (
            <GlassButton type="primary" icon={<ShopOutlined />} onClick={() => navigate('/hotels/new')}>
              新增酒店
            </GlassButton>
          )}
          {role === 'admin' && (
            <GlassButton type="primary" onClick={() => navigate('/audit')}>
              查看待审核
            </GlassButton>
          )}
          <GlassButton icon={<PercentageOutlined />} onClick={() => setDiscountModal(true)}>
            批量设置折扣
          </GlassButton>
          <GlassButton icon={<EditOutlined />} onClick={() => setRoomModal(true)}>
            批量房型操作
          </GlassButton>
        </Space>
      </Card>

      {/* 批量折扣弹窗 */}
      <Modal
        title="批量设置折扣"
        open={discountModal}
        onCancel={() => setDiscountModal(false)}
        footer={null}
        width={700}
      >
        <Form form={discountForm} layout="vertical" initialValues={{ scope: 'all', discount: 9, action: 'set', discountType: 'rate', amount: 50 }}>
          <Form.Item name="scope" label="应用范围">
            <Select options={[
              { value: 'all', label: '所有已上架酒店' },
              { value: 'selected', label: '选择特定酒店' }
            ]} />
          </Form.Item>

          <Form.Item name="action" label="折扣操作" rules={[{ required: true, message: '请选择操作' }]}>
            <Select options={[
              { value: 'set', label: '设置折扣' },
              { value: 'cancel', label: '取消折扣' }
            ]} />
          </Form.Item>
          
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.scope !== cur.scope}>
            {({ getFieldValue }) => getFieldValue('scope') === 'selected' && (
              <Form.Item label="选择酒店">
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

          <Form.Item name="roomTypeName" label="房型" rules={[{ required: true, message: '请选择房型' }]}>
            <Select
              placeholder={statsLoading ? '加载中...' : '选择房型'}
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
                  已用 {stats.used} 间，空闲 {stats.available} 间
                </Typography.Text>
              )
            }}
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.action !== cur.action || prev.discountType !== cur.discountType}>
            {({ getFieldValue }) => getFieldValue('action') !== 'cancel' && (
              <>
                <Form.Item name="quantity" label="折扣数量" rules={[{ required: true }]}>
                  <InputNumber
                    min={1}
                    style={{ width: 150 }}
                    formatter={(value) => `${value} 间`}
                    parser={(value) => value?.replace(/[^\d]/g, '')}
                  />
                </Form.Item>

                <Form.Item name="discountType" label="折扣类型" rules={[{ required: true }]}>
                  <Radio.Group>
                    <Radio value="rate">折扣率</Radio>
                    <Radio value="amount">固定减免</Radio>
                  </Radio.Group>
                </Form.Item>

                {getFieldValue('discountType') === 'rate' ? (
                  <Form.Item name="discount" label="折扣力度" rules={[{ required: true }]}>
                    <InputNumber
                      min={0.1}
                      max={10}
                      step={0.5}
                      style={{ width: 150 }}
                      formatter={(value) => `${value} 折`}
                      parser={(value) => value?.replace(/[^\d.]/g, '')}
                    />
                  </Form.Item>
                ) : (
                  <Form.Item name="amount" label="减免金额" rules={[{ required: true }]}>
                    <InputNumber
                      min={1}
                      style={{ width: 150 }}
                      formatter={(value) => `¥ ${value}`}
                      parser={(value) => value?.replace(/[^\d]/g, '')}
                    />
                  </Form.Item>
                )}
              </>
            )}
          </Form.Item>

          <Form.Item>
            <Space>
              <GlassButton type="primary" loading={batchLoading} onClick={handleBatchDiscount}>
                确认设置
              </GlassButton>
              <GlassButton onClick={() => setDiscountModal(false)}>取消</GlassButton>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量房型操作弹窗 */}
      <Modal
        title="批量房型操作"
        open={roomModal}
        onCancel={() => setRoomModal(false)}
        footer={null}
        width={700}
      >
        <Form form={roomForm} layout="vertical" initialValues={{ action: 'offline' }}>
          <Form.Item label="选择酒店" required>
            <Table
              rowSelection={rowSelection}
              columns={hotelColumns}
              dataSource={hotels.filter(h => h.status === 'approved')}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 5 }}
            />
            {selectedHotels.length > 0 && (
              <Typography.Text type="secondary">已选择 {selectedHotels.length} 家酒店</Typography.Text>
            )}
          </Form.Item>

          <Form.Item name="action" label="操作类型">
            <Select options={[
              { value: 'offline', label: '下架房型' },
              { value: 'adjust_stock', label: '调整库存' }
            ]} />
          </Form.Item>

          <Form.Item name="roomTypeName" label="房型" rules={[{ required: true, message: '请选择房型' }]}>
            <Select 
              placeholder="选择要操作的房型"
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
                  已用 {stats.used} 间，空闲 {stats.available} 间
                </Typography.Text>
              )
            }}
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.action !== cur.action}>
            {({ getFieldValue }) => getFieldValue('action') === 'adjust_stock' && (
              <Form.Item name="stock" label="库存数量" rules={[{ required: true }]}>
                <InputNumber
                  min={0}
                  style={{ width: 150 }}
                  formatter={(value) => `${value} 间`}
                  parser={(value) => value?.replace(/[^\d]/g, '')}
                />
              </Form.Item>
            )}
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.action !== cur.action}>
            {({ getFieldValue }) => getFieldValue('action') === 'offline' && (
              <Form.Item name="quantity" label="下架数量" rules={[{ required: true }]}>
                <InputNumber
                  min={1}
                  style={{ width: 150 }}
                  formatter={(value) => `${value} 间`}
                  parser={(value) => value?.replace(/[^\d]/g, '')}
                />
              </Form.Item>
            )}
          </Form.Item>

          <Form.Item>
            <Space>
              <GlassButton type="primary" loading={batchLoading} onClick={handleBatchRoom}>
                确认操作
              </GlassButton>
              <GlassButton onClick={() => setRoomModal(false)}>取消</GlassButton>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

    </div>
  )
}
