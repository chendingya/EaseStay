import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Form, Input, InputNumber, Select, Button, Space, Typography, Divider,
  Row, Col, Spin, Image, Tag, Table, Descriptions, Tabs, Breadcrumb
} from 'antd'
import { EyeOutlined, EditOutlined, StarFilled, EnvironmentOutlined, CalendarOutlined } from '@ant-design/icons'
import { GlassCard, glassMessage as message } from '../components/GlassUI'

const apiBase = 'http://127.0.0.1:4100'

// 预览组件 - 使用玻璃卡片，无额外背景
function HotelPreview({ data }) {
  if (!data) return null

  const roomColumns = [
    { title: '房型名称', dataIndex: 'name', key: 'name' },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      render: (price) => <span style={{ color: '#f5222d', fontWeight: 600 }}>¥{price || 0}</span>
    },
    { title: '库存', dataIndex: 'stock', key: 'stock', render: (v) => v || 0 }
  ]

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {/* 头部图片 */}
      <GlassCard bodyStyle={{ padding: 0 }} style={{ overflow: 'hidden' }}>
        {data.images && data.images.length > 0 ? (
          <div style={{ position: 'relative' }}>
            <Image
              src={data.images[0]}
              alt={data.name}
              width="100%"
              height={200}
              style={{ objectFit: 'cover' }}
              fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88P/BfwYACP4D/pHOlKYAAAAASUVORK5CYII="
            />
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
              padding: '30px 16px 16px',
              color: '#fff'
            }}>
              <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>
                {data.name || '酒店名称'}
              </Typography.Title>
              {data.name_en && (
                <Typography.Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>
                  {data.name_en}
                </Typography.Text>
              )}
            </div>
          </div>
        ) : (
          <div style={{ height: 120, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography.Text type="secondary">暂无图片</Typography.Text>
          </div>
        )}
      </GlassCard>

      {/* 基本信息 */}
      <GlassCard size="small" title="基本信息">
        <Descriptions column={2} size="small">
          <Descriptions.Item label={<><EnvironmentOutlined /> 城市</>}>{data.city || '-'}</Descriptions.Item>
          <Descriptions.Item label="地址">{data.address || '-'}</Descriptions.Item>
          <Descriptions.Item label={<><StarFilled style={{ color: '#faad14' }} /> 星级</>}>
            {data.star_rating ? `${data.star_rating} 星级` : '未评级'}
          </Descriptions.Item>
          <Descriptions.Item label={<><CalendarOutlined /> 开业时间</>}>
            {data.opening_time || '未填写'}
          </Descriptions.Item>
        </Descriptions>
        {data.description && (
          <Typography.Paragraph style={{ marginTop: 12, marginBottom: 0 }} ellipsis={{ rows: 2 }}>
            {data.description}
          </Typography.Paragraph>
        )}
      </GlassCard>

      {/* 设施标签 */}
      {data.facilities && data.facilities.length > 0 && (
        <GlassCard size="small" title="设施服务">
          <Space wrap size={[4, 4]}>
            {data.facilities.map((item, index) => (
              <Tag key={index} color="blue">{item}</Tag>
            ))}
          </Space>
        </GlassCard>
      )}

      {/* 房型信息 */}
      <GlassCard size="small" title="房型信息">
        <Table
          columns={roomColumns}
          dataSource={(data.roomTypes || []).filter(r => r && r.name)}
          rowKey={(_, index) => index}
          pagination={false}
          size="small"
          locale={{ emptyText: '暂无房型' }}
        />
      </GlassCard>

      {/* 优惠信息 */}
      {data.promotions && data.promotions.filter(p => p && p.title).length > 0 && (
        <GlassCard size="small" title="优惠活动">
          <Space direction="vertical" style={{ width: '100%' }} size={4}>
            {data.promotions.filter(p => p && p.title).map((promo, index) => (
              <div key={index} style={{ padding: '6px 10px', background: '#fff7e6', borderRadius: 4, fontSize: 13 }}>
                {promo.type && <Tag color="orange" style={{ marginRight: 8 }}>{promo.type}</Tag>}
                <span>{promo.title}</span>
                {promo.value && <span style={{ color: '#f5222d', marginLeft: 8 }}>{promo.value}折</span>}
              </div>
            ))}
          </Space>
        </GlassCard>
      )}
    </Space>
  )
}

export default function HotelEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('edit')
  const [previewData, setPreviewData] = useState({})

  const isEditing = !!id

  useEffect(() => {
    if (id) {
      const fetchHotel = async () => {
        const token = localStorage.getItem('token')
        if (!token) return
        setLoading(true)
        try {
          const response = await fetch(`${apiBase}/api/merchant/hotels/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          const data = await response.json()
          if (!response.ok) {
            message.error(data.message || '获取酒店详情失败')
            navigate('/hotels')
            return
          }
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
          setPreviewData(data)
        } catch {
          message.error('获取酒店详情失败')
        } finally {
          setLoading(false)
        }
      }
      fetchHotel()
    }
  }, [id, navigate, form])

  // 监听表单变化更新预览
  const handleFormChange = () => {
    const values = form.getFieldsValue()
    setPreviewData(values)
  }

  const handleSubmit = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const values = await form.validateFields()
      const payload = {
        ...values,
        star_rating: Number(values.star_rating || 0),
        roomTypes: (values.roomTypes || []).filter((room) => room && room.name),
        promotions: (values.promotions || []).filter((promo) => promo && promo.title)
      }
      setSaving(true)
      const response = await fetch(
        isEditing ? `${apiBase}/api/merchant/hotels/${id}` : `${apiBase}/api/merchant/hotels`,
        {
          method: isEditing ? 'PUT' : 'POST',
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
      navigate('/hotels')
    } catch (err) {
      if (err.errorFields) {
        message.error('请填写必填项')
      } else {
        message.error('保存失败')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    )
  }

  const tabItems = [
    {
      key: 'edit',
      label: <span><EditOutlined /> 编辑信息</span>,
      children: (
        <Form
          layout="vertical"
          form={form}
          initialValues={{ star_rating: 0 }}
          onValuesChange={handleFormChange}
        >
          {/* 基本信息 */}
          <Typography.Title level={5}>基本信息</Typography.Title>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="酒店名称（中文）" rules={[{ required: true, message: '请输入酒店中文名' }]}>
                <Input placeholder="请输入酒店中文名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="name_en" label="酒店名称（英文）">
                <Input placeholder="请输入酒店英文名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="city" label="城市" rules={[{ required: true, message: '请输入城市' }]}>
                <Input placeholder="请输入城市" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="address" label="地址" rules={[{ required: true, message: '请输入地址' }]}>
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
            <Col span={24}>
              <Form.Item name="description" label="酒店描述">
                <Input.TextArea rows={3} placeholder="请输入酒店描述" />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          {/* 设施与图片 */}
          <Typography.Title level={5}>设施与图片</Typography.Title>
          <Form.Item name="facilities" label="设施标签">
            <Select mode="tags" tokenSeparators={[',']} placeholder="输入后回车，如：免费WiFi、停车场、游泳池" />
          </Form.Item>
          <Form.Item name="images" label="图片链接">
            <Select mode="tags" tokenSeparators={[',']} placeholder="输入图片链接后回车" />
          </Form.Item>

          <Divider />

          {/* 周边信息 */}
          <Typography.Title level={5}>周边信息</Typography.Title>
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

          <Divider />

          {/* 优惠信息 */}
          <Typography.Title level={5}>优惠信息</Typography.Title>
          <Form.List name="promotions">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                {fields.map((field, index) => (
                  <Row gutter={16} key={field.key} align="bottom">
                    <Col span={6}>
                      <Form.Item {...field} name={[field.name, 'type']} label={index === 0 ? "类型" : undefined} style={{ marginBottom: 0 }}>
                        <Input placeholder="festival/套餐等" />
                      </Form.Item>
                    </Col>
                    <Col span={10}>
                      <Form.Item {...field} name={[field.name, 'title']} label={index === 0 ? "标题" : undefined} style={{ marginBottom: 0 }}>
                        <Input placeholder="例如 节日 8 折" />
                      </Form.Item>
                    </Col>
                    <Col span={5}>
                      <Form.Item {...field} name={[field.name, 'value']} label={index === 0 ? "折扣" : undefined} style={{ marginBottom: 0 }}>
                        <InputNumber style={{ width: '100%' }} placeholder="如 8" />
                      </Form.Item>
                    </Col>
                    <Col span={3}>
                      <Button type="link" danger onClick={() => remove(field.name)} style={{ padding: '4px 0' }}>删除</Button>
                    </Col>
                  </Row>
                ))}
                <Button type="dashed" onClick={() => add()} block>新增优惠</Button>
              </Space>
            )}
          </Form.List>

          <Divider />

          {/* 房型信息 */}
          <Typography.Title level={5}>房型信息</Typography.Title>
          <Form.List name="roomTypes">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                {fields.map((field, index) => (
                  <Row gutter={16} key={field.key} align="bottom">
                    <Col span={8}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'name']}
                        label={index === 0 ? "房型名称" : undefined}
                        rules={[{ required: true, message: '请输入房型名称' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input placeholder="例如 豪华大床房" />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'price']}
                        label={index === 0 ? "价格" : undefined}
                        rules={[{ required: true, message: '请输入价格' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber min={0} style={{ width: '100%' }} prefix="¥" />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item {...field} name={[field.name, 'stock']} label={index === 0 ? "库存" : undefined} style={{ marginBottom: 0 }}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Button type="link" danger onClick={() => remove(field.name)} style={{ padding: '4px 0' }}>删除</Button>
                    </Col>
                  </Row>
                ))}
                <Button type="dashed" onClick={() => add()} block>新增房型</Button>
              </Space>
            )}
          </Form.List>
        </Form>
      )
    },
    {
      key: 'preview',
      label: <span><EyeOutlined /> 预览效果</span>,
      children: <HotelPreview data={previewData} />
    }
  ]

  return (
    <>
      {/* 面包屑导航 */}
      <Breadcrumb style={{ marginBottom: 16 }} items={[
        { title: <a onClick={() => navigate('/hotels')}>酒店管理</a> },
        { title: isEditing ? '编辑酒店' : '新增酒店' }
      ]} />

      {/* 页面标题和操作按钮 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {isEditing ? '编辑酒店' : '新增酒店'}
        </Typography.Title>
        <Space>
          <Button onClick={() => navigate('/hotels')}>取消</Button>
          <Button type="primary" loading={saving} onClick={handleSubmit}>
            {isEditing ? '保存修改' : '提交审核'}
          </Button>
        </Space>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
    </>
  )
}
