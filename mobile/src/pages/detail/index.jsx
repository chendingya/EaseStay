import { View } from '@tarojs/components'
import { Button, Card, Space, Tag, Typography, List as AntList } from 'antd'
import './index.css'

const roomTypes = [
  { id: 1, name: '标准间', price: 299 },
  { id: 2, name: '豪华大床房', price: 399 }
]

export default function Detail() {
  return (
    <View className="page">
      <Card className="banner-card">
        <div className="banner">酒店图片</div>
      </Card>
      <Card className="info-card">
        <Typography.Title level={4}>易宿酒店</Typography.Title>
        <Typography.Text type="secondary">上海 · 市中心 · 4 星</Typography.Text>
        <Space style={{ marginTop: 12 }} size="small" wrap>
          <Tag color="blue">免费停车</Tag>
          <Tag color="green">含早餐</Tag>
          <Tag color="purple">亲子友好</Tag>
        </Space>
      </Card>
      <Card className="room-card">
        <Typography.Title level={5}>房型</Typography.Title>
        <AntList
          dataSource={roomTypes}
          renderItem={(item) => (
            <AntList.Item>
              <Space>
                <Typography.Text>{item.name}</Typography.Text>
                <Typography.Text strong>¥{item.price}</Typography.Text>
              </Space>
            </AntList.Item>
          )}
        />
        <Button type="primary" block>立即预订</Button>
      </Card>
    </View>
  )
}
