import { Card, Table, Tag, Button, Space, Typography, Drawer, Form, Input, InputNumber, Select, message, Divider, Row, Col } from 'antd'
import { useEffect, useState } from 'react'

const apiBase = 'http://127.0.0.1:4100'

const statusMap = {
  pending: { color: 'orange', label: '待审核' },
  approved: { color: 'green', label: '已上架' },
  rejected: { color: 'red', label: '已驳回' },
  offline: { color: 'default', label: '已下线' }
}

export default function Hotels() {
  const [form] = Form.useForm()
  const [hotels, setHotels] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const role = localStorage.getItem('role')

  const fetchHotels = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    setLoading(true)
    try {
      const response = await fetch(`${apiBase}/api/merchant/hotels`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      if (!response.ok) {
        message.error(data.message || '获取酒店列表失败')
        return
      }
      setHotels(data)
    } catch {
      message.error('获取酒店列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (role === 'merchant') {
      fetchHotels()
    }
  }, [role])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    setDrawerOpen(true)
  }

  const openEdit = (record) => {
    const loadDetail = async () => {
      const token = localStorage.getItem('token')
      if (!token) return
      setLoading(true)
      try {
        const response = await fetch(`${apiBase}/api/merchant/hotels/${record.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await response.json()
        if (!response.ok) {
          message.error(data.message || '获取酒店详情失败')
          return
        }
        setEditing(data)
        form.setFieldsValue({
          ...data,
          roomTypes: data.roomTypes || [],
          facilities: data.facilities || [],
          images: data.images || [],
          nearby_attractions: data.nearby_attractions || [],
          nearby_transport: data.nearby_transport || [],
          nearby_malls: data.nearby_malls || [],
          promotions: data.promotions || []
        })
        setDrawerOpen(true)
      } catch {
        message.error('获取酒店详情失败')
      } finally {
        setLoading(false)
      }
    }
    loadDetail()
  }

  const handleSubmit = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    const values = await form.validateFields()
    const payload = {
      ...values,
      star_rating: Number(values.star_rating || 0),
      roomTypes: (values.roomTypes || []).filter((room) => room && room.name),
      promotions: (values.promotions || []).filter((promo) => promo && promo.title)
    }
    setSaving(true)
    try {
      const response = await fetch(
        editing ? `${apiBase}/api/merchant/hotels/${editing.id}` : `${apiBase}/api/merchant/hotels`,
        {
          method: editing ? 'PUT' : 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      )
      const data = await response.json()
      if (!response.ok) {
        message.error(data.message || '保存失败')
        return
      }
      message.success('保存成功')
      setDrawerOpen(false)
      setEditing(null)
      form.resetFields()
      fetchHotels()
    } catch {
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { title: '酒店名称', dataIndex: 'name' },
    { title: '英文名', dataIndex: 'name_en' },
    { title: '城市', dataIndex: 'city' },
    { title: '星级', dataIndex: 'star_rating' },
    { title: '最低价', dataIndex: 'lowestPrice' },
    { title: '开业时间', dataIndex: 'opening_time' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (value) => {
        const info = statusMap[value] || { color: 'default', label: value }
        return <Tag color={info.color}>{info.label}</Tag>
      }
    },
    {
      title: '操作',
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => openEdit(record)}>编辑</Button>
        </Space>
      )
    }
  ]

  return (
    <Card
      title={<Typography.Title level={5} style={{ margin: 0 }}>酒店管理</Typography.Title>}
      extra={<Button type="primary" onClick={openCreate}>新增酒店</Button>}
    >
      <Table
        columns={columns}
        dataSource={hotels}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 8 }}
      />
      <Drawer
        title={editing ? '编辑酒店' : '新增酒店'}
        width={720}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={<Button type="primary" loading={saving} onClick={handleSubmit}>保存</Button>}
      >
        <Form layout="vertical" form={form} initialValues={{ star_rating: 0 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="酒店名称（中文）" rules={[{ required: true }]}>
                <Input placeholder="请输入酒店中文名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="name_en" label="酒店名称（英文）">
                <Input placeholder="请输入酒店英文名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="city" label="城市" rules={[{ required: true }]}>
                <Input placeholder="请输入城市" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="address" label="地址" rules={[{ required: true }]}>
                <Input placeholder="请输入地址" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="star_rating" label="星级">
                <InputNumber min={0} max={5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="opening_time" label="开业时间">
                <Input placeholder="例如 2016-05-01" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="酒店描述">
            <Input.TextArea rows={3} placeholder="请输入酒店描述" />
          </Form.Item>
          <Form.Item name="facilities" label="设施标签">
            <Select mode="tags" tokenSeparators={[',']} placeholder="输入后回车" />
          </Form.Item>
          <Form.Item name="images" label="图片链接">
            <Select mode="tags" tokenSeparators={[',']} placeholder="输入图片链接后回车" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="nearby_attractions" label="附近景点">
                <Select mode="tags" tokenSeparators={[',']} placeholder="输入后回车" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="nearby_transport" label="交通信息">
                <Select mode="tags" tokenSeparators={[',']} placeholder="输入后回车" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="nearby_malls" label="商场信息">
                <Select mode="tags" tokenSeparators={[',']} placeholder="输入后回车" />
              </Form.Item>
            </Col>
          </Row>
          <Divider>优惠信息</Divider>
          <Form.List name="promotions">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: '100%' }}>
                {fields.map((field) => (
                  <Row gutter={16} key={field.key}>
                    <Col span={6}>
                      <Form.Item {...field} name={[field.name, 'type']} label="类型">
                        <Input placeholder="festival/套餐等" />
                      </Form.Item>
                    </Col>
                    <Col span={10}>
                      <Form.Item {...field} name={[field.name, 'title']} label="标题">
                        <Input placeholder="例如 节日 8 折" />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item {...field} name={[field.name, 'value']} label="数值">
                        <InputNumber style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={2} style={{ display: 'flex', alignItems: 'center' }}>
                      <Button type="link" danger onClick={() => remove(field.name)}>删除</Button>
                    </Col>
                  </Row>
                ))}
                <Button type="dashed" onClick={() => add()} block>新增优惠</Button>
              </Space>
            )}
          </Form.List>
          <Divider>房型信息</Divider>
          <Form.List name="roomTypes">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: '100%' }}>
                {fields.map((field) => (
                  <Row gutter={16} key={field.key}>
                    <Col span={8}>
                      <Form.Item {...field} name={[field.name, 'name']} label="房型名称" rules={[{ required: true }]}>
                        <Input placeholder="例如 豪华大床房" />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item {...field} name={[field.name, 'price']} label="价格" rules={[{ required: true }]}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item {...field} name={[field.name, 'stock']} label="库存">
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={4} style={{ display: 'flex', alignItems: 'center' }}>
                      <Button type="link" danger onClick={() => remove(field.name)}>删除</Button>
                    </Col>
                  </Row>
                ))}
                <Button type="dashed" onClick={() => add()} block>新增房型</Button>
              </Space>
            )}
          </Form.List>
        </Form>
      </Drawer>
    </Card>
  )
}
