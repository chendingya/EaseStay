import { Card, Col, Row, Statistic, Space, Button, Typography } from 'antd'

export default function Dashboard() {
  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic title="待审核酒店" value={12} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="已上架酒店" value={86} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="今日新增酒店" value={5} />
          </Card>
        </Col>
      </Row>
      <Card>
        <Typography.Title level={5}>快捷操作</Typography.Title>
        <Space>
          <Button type="primary">新增酒店</Button>
          <Button>查看待审核</Button>
        </Space>
      </Card>
    </Space>
  )
}
