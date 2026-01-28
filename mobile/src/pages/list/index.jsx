import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Button, Card, Space, Tag, Typography } from 'antd'
import './index.css'

const hotels = [
  { id: 1, name: '易宿酒店', city: '上海', price: 399, star: 4, score: 4.7, distance: '1.2km' },
  { id: 2, name: '青柠酒店', city: '北京', price: 499, star: 5, score: 4.9, distance: '2.6km' }
]

export default function List() {
  return (
    <View className="page">
      <Card className="filter-card">
        <Space size="small" wrap>
          <Tag color="blue">推荐</Tag>
          <Tag>价格</Tag>
          <Tag>距离</Tag>
          <Tag>星级</Tag>
          <Tag>亲子</Tag>
        </Space>
      </Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {hotels.map((hotel) => (
          <Card key={hotel.id} className="hotel-card">
            <Typography.Title level={5}>{hotel.name}</Typography.Title>
            <Typography.Text type="secondary">{hotel.city} · {hotel.distance}</Typography.Text>
            <Space style={{ marginTop: 8 }} size="small" wrap>
              <Tag color="blue">{hotel.star} 星</Tag>
              <Tag color="green">¥{hotel.price}</Tag>
              <Tag color="gold">评分 {hotel.score}</Tag>
            </Space>
            <Button
              type="primary"
              style={{ marginTop: 12 }}
              onClick={() => Taro.navigateTo({ url: '/pages/detail/index' })}
            >
              查看详情
            </Button>
          </Card>
        ))}
      </Space>
    </View>
  )
}
