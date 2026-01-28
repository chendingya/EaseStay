import { Card, Table, Button, Space, Typography } from 'antd'

const dataSource = [
  { key: 1, name: '易宿酒店', city: '上海', submittedAt: '2026-01-28' },
  { key: 2, name: '青柠酒店', city: '北京', submittedAt: '2026-01-27' }
]

const columns = [
  { title: '酒店名称', dataIndex: 'name' },
  { title: '城市', dataIndex: 'city' },
  { title: '提交时间', dataIndex: 'submittedAt' },
  {
    title: '操作',
    render: () => (
      <Space>
        <Button type="primary">通过</Button>
        <Button danger>驳回</Button>
      </Space>
    )
  }
]

export default function Audit() {
  return (
    <Card>
      <Typography.Title level={5}>审核列表</Typography.Title>
      <Table columns={columns} dataSource={dataSource} pagination={{ pageSize: 5 }} />
    </Card>
  )
}
