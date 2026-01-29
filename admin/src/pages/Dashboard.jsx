import { Card, Col, Row, Statistic, Space, Typography, Modal, Form, InputNumber, Select, Table } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PercentageOutlined, EditOutlined, ShopOutlined } from '@ant-design/icons'
import { GlassButton, glassMessage as message } from '../components/GlassUI'

const apiBase = 'http://127.0.0.1:4100'

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

  useEffect(() => {
    fetchData()
  }, [role])

  const fetchData = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    setLoading(true)
    try {
      const url = role === 'admin' ? `${apiBase}/api/admin/hotels` : `${apiBase}/api/merchant/hotels`
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const data = await response.json()
      if (!response.ok) { message.error('获取数据失败'); return }
      
      setHotels(data)
      const counts = data.reduce((acc, item) => {
        acc.total += 1
        if (item.status === 'pending') acc.pending += 1
        if (item.status === 'approved') acc.approved += 1
        if (item.status === 'offline') acc.offline += 1
        return acc
      }, { pending: 0, approved: 0, offline: 0, total: 0 })
      setStats(counts)
    } finally { setLoading(false) }
  }

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

      // 模拟批量更新 - 实际项目应调用后端批量接口
      message.success(`已为 ${targetHotels.length} 家酒店设置 ${values.discount} 折优惠`)
      setDiscountModal(false)
      discountForm.resetFields()
      setSelectedHotels([])
    } catch (err) {
      message.error('操作失败')
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

      if (values.action === 'offline') {
        message.success(`已下架 ${targetHotels.length} 家酒店的「${values.roomType}」房型`)
      } else if (values.action === 'adjust_stock') {
        message.success(`已调整 ${targetHotels.length} 家酒店的「${values.roomType}」库存为 ${values.stock}`)
      }
      
      setRoomModal(false)
      roomForm.resetFields()
      setSelectedHotels([])
    } catch (err) {
      message.error('操作失败')
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 24 }}>
      {/* 统计卡片 */}
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
        <Col span={6}>
          <Card><Statistic title="酒店总数" value={stats.total} loading={loading} /></Card>
        </Col>
      </Row>

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
        <Form form={discountForm} layout="vertical" initialValues={{ scope: 'all', discount: 9 }}>
          <Form.Item name="scope" label="应用范围">
            <Select options={[
              { value: 'all', label: '所有已上架酒店' },
              { value: 'selected', label: '选择特定酒店' }
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

          <Form.Item name="discount" label="折扣力度" rules={[{ required: true }]}>
            <InputNumber min={1} max={10} step={0.5} addonAfter="折" style={{ width: 150 }} />
          </Form.Item>

          <Form.Item name="promoTitle" label="优惠名称">
            <Select options={[
              { value: '限时特惠', label: '限时特惠' },
              { value: '新春特惠', label: '新春特惠' },
              { value: '周末特惠', label: '周末特惠' },
              { value: '会员专享', label: '会员专享' }
            ]} placeholder="选择优惠名称" />
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

          <Form.Item name="roomType" label="房型" rules={[{ required: true, message: '请选择房型' }]}>
            <Select 
              placeholder="选择要操作的房型"
              options={[
                { value: '标准双床房', label: '标准双床房' },
                { value: '标准大床房', label: '标准大床房' },
                { value: '豪华大床房', label: '豪华大床房' },
                { value: '豪华双床房', label: '豪华双床房' },
                { value: '商务套房', label: '商务套房' },
                { value: '行政套房', label: '行政套房' }
              ]}
            />
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.action !== cur.action}>
            {({ getFieldValue }) => getFieldValue('action') === 'adjust_stock' && (
              <Form.Item name="stock" label="库存数量" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: 150 }} addonAfter="间" />
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

      {/* 最近酒店 */}
      <Card title="我的酒店">
        <Table
          columns={[
            { title: '酒店名称', dataIndex: 'name', key: 'name' },
            { title: '城市', dataIndex: 'city', key: 'city' },
            { title: '星级', dataIndex: 'star_rating', key: 'star_rating', render: (v) => v ? `${v}星` : '-' },
            { 
              title: '状态', 
              dataIndex: 'status', 
              key: 'status',
              render: (s) => {
                const map = { approved: { text: '已上架', color: '#52c41a' }, pending: { text: '待审核', color: '#faad14' }, rejected: { text: '已拒绝', color: '#f5222d' }, offline: { text: '已下架', color: '#999' } }
                const info = map[s] || { text: s, color: '#666' }
                return <span style={{ color: info.color }}>{info.text}</span>
              }
            },
            {
              title: '操作',
              key: 'action',
              render: (_, record) => (
                <Space>
                  <GlassButton type="link" size="small" onClick={() => navigate(`/hotels/${record.id}`)}>查看</GlassButton>
                  <GlassButton type="link" size="small" onClick={() => navigate(`/hotels/${record.id}/edit`)}>编辑</GlassButton>
                </Space>
              )
            }
          ]}
          dataSource={hotels.slice(0, 10)}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="small"
        />
        {hotels.length > 10 && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <GlassButton type="link" onClick={() => navigate('/hotels')}>查看全部 {hotels.length} 家酒店</GlassButton>
          </div>
        )}
      </Card>
    </div>
  )
}
