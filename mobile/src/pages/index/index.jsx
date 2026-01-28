import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Button, Card, Input, Space, Tag, Typography } from 'antd'
import './index.css'

const { Title, Text } = Typography

export default function Index() {
  return (
    <View className="page">
      <Card className="hero" variant="borderless">
        <Title level={3} className="title">易宿酒店预订</Title>
        <Text type="secondary">轻松找到心仪酒店</Text>
        <Space className="quick-tags" size="small" wrap>
          <Tag color="blue">亲子</Tag>
          <Tag color="green">免费停车</Tag>
          <Tag color="orange">高评分</Tag>
          <Tag color="purple">近地铁</Tag>
        </Space>
      </Card>
      <Card className="search-card">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Input placeholder="城市，如 上海" />
          <Input placeholder="酒店名/商圈/地标" />
          <Space>
            <Input placeholder="入住日期" />
            <Input placeholder="离店日期" />
          </Space>
          <Button type="primary" onClick={() => Taro.navigateTo({ url: '/pages/list/index' })}>搜索酒店</Button>
          <Button onClick={() => Taro.navigateTo({ url: '/pages/detail/index' })}>查看详情示例</Button>
        </Space>
      </Card>
    </View>
  )
}
