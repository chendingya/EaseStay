import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Tag, Image, Space, Typography, Table, Spin, Row, Col } from 'antd'
import { StarFilled, EnvironmentOutlined, CalendarOutlined } from '@ant-design/icons'
import { GlassButton, glassMessage as message } from '../components/GlassUI'

const apiBase = 'http://127.0.0.1:4100'

const statusMap = {
  pending: { color: 'orange', label: '待审核' },
  approved: { color: 'green', label: '已上架' },
  rejected: { color: 'red', label: '已驳回' },
  offline: { color: 'default', label: '已下线' }
}

export default function HotelDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [hotel, setHotel] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
        setHotel(data)
      } catch {
        message.error('获取酒店详情失败')
      } finally {
        setLoading(false)
      }
    }
    fetchHotel()
  }, [id, navigate])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!hotel) {
    return null
  }

  const statusInfo = statusMap[hotel.status] || { color: 'default', label: hotel.status }

  const roomColumns = [
    { title: '房型名称', dataIndex: 'name', key: 'name' },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      render: (price) => <span style={{ color: '#f5222d', fontWeight: 600 }}>¥{price}</span>
    },
    { title: '库存', dataIndex: 'stock', key: 'stock' }
  ]

  return (
    <>
      {/* 页面标题和操作按钮 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {hotel.name}
            <Tag color={statusInfo.color} style={{ marginLeft: 12, verticalAlign: 'middle' }}>
              {statusInfo.label}
            </Tag>
          </Typography.Title>
          {hotel.name_en && (
            <Typography.Text type="secondary">{hotel.name_en}</Typography.Text>
          )}
        </div>
        <GlassButton type="primary" onClick={() => navigate(`/hotels/edit/${hotel.id}`)}>
          编辑酒店
        </GlassButton>
      </div>

      {/* 头部大图 */}
      {hotel.images && hotel.images.length > 0 && (
        <Card bodyStyle={{ padding: 0 }} style={{ marginBottom: 24, overflow: 'hidden' }}>
          <Image
            src={hotel.images[0]}
            alt={hotel.name}
            width="100%"
            height={280}
            style={{ objectFit: 'cover' }}
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88P/BfwYACP4D/pHOlKYAAAAASUVORK5CYII="
          />
        </Card>
      )}

      <Row gutter={24}>
        <Col span={16}>
          {/* 基本信息 */}
          <Card title="基本信息" style={{ marginBottom: 24 }}>
            <Descriptions column={2}>
              <Descriptions.Item label={<><EnvironmentOutlined /> 城市</>}>{hotel.city}</Descriptions.Item>
              <Descriptions.Item label="地址">{hotel.address}</Descriptions.Item>
              <Descriptions.Item label={<><StarFilled style={{ color: '#faad14' }} /> 星级</>}>
                {hotel.star_rating ? `${hotel.star_rating} 星级` : '未评级'}
              </Descriptions.Item>
              <Descriptions.Item label={<><CalendarOutlined /> 开业时间</>}>
                {hotel.opening_time || '未填写'}
              </Descriptions.Item>
            </Descriptions>
            {hotel.description && (
              <Typography.Paragraph style={{ marginTop: 16, marginBottom: 0 }}>{hotel.description}</Typography.Paragraph>
            )}
          </Card>

          {/* 房型信息 */}
          <Card title="房型信息" style={{ marginBottom: 24 }}>
            <Table
              columns={roomColumns}
              dataSource={hotel.roomTypes || []}
              rowKey="id"
              pagination={false}
              locale={{ emptyText: '暂无房型信息' }}
            />
          </Card>

          {/* 图片展示 */}
          {hotel.images && hotel.images.length > 1 && (
            <Card title="酒店图片">
              <Image.PreviewGroup>
                <Space wrap>
                  {hotel.images.slice(1).map((url, index) => (
                    <Image
                      key={index}
                      src={url}
                      alt={`${hotel.name}-${index + 1}`}
                      width={150}
                      height={100}
                      style={{ objectFit: 'cover', borderRadius: 4 }}
                    />
                  ))}
                </Space>
              </Image.PreviewGroup>
            </Card>
          )}
        </Col>

        <Col span={8}>
          {/* 设施标签 */}
          {hotel.facilities && hotel.facilities.length > 0 && (
            <Card title="设施服务" size="small" style={{ marginBottom: 16 }}>
              <Space wrap>
                {hotel.facilities.map((item, index) => (
                  <Tag key={index} color="blue">{item}</Tag>
                ))}
              </Space>
            </Card>
          )}

          {/* 优惠信息 */}
          {hotel.promotions && hotel.promotions.length > 0 && (
            <Card title="优惠活动" size="small" style={{ marginBottom: 16 }}>
              <Space style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                {hotel.promotions.map((promo, index) => (
                  <div key={index} style={{ padding: '8px 12px', background: '#fff7e6', borderRadius: 4 }}>
                    <Tag color="orange">{promo.type}</Tag>
                    <span>{promo.title}</span>
                    {promo.value && <span style={{ color: '#f5222d', marginLeft: 8 }}>{promo.value}折</span>}
                  </div>
                ))}
              </Space>
            </Card>
          )}

          {/* 周边信息 */}
          <Card title="周边信息" size="small">
            {hotel.nearby_attractions && hotel.nearby_attractions.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <Typography.Text type="secondary">热门景点</Typography.Text>
                <div style={{ marginTop: 4 }}>
                  {hotel.nearby_attractions.map((item, index) => (
                    <Tag key={index}>{item}</Tag>
                  ))}
                </div>
              </div>
            )}
            {hotel.nearby_transport && hotel.nearby_transport.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <Typography.Text type="secondary">交通出行</Typography.Text>
                <div style={{ marginTop: 4 }}>
                  {hotel.nearby_transport.map((item, index) => (
                    <Tag key={index}>{item}</Tag>
                  ))}
                </div>
              </div>
            )}
            {hotel.nearby_malls && hotel.nearby_malls.length > 0 && (
              <div>
                <Typography.Text type="secondary">购物商场</Typography.Text>
                <div style={{ marginTop: 4 }}>
                  {hotel.nearby_malls.map((item, index) => (
                    <Tag key={index}>{item}</Tag>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </>
  )
}
