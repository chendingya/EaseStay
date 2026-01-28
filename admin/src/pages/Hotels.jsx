import { Card, Table, Tag, Button, Space, Typography } from 'antd'

const dataSource = [
  { key: 1, name: '易宿酒店', city: '上海', star: 4, status: 'pending', price: 399 },
  { key: 2, name: '青柠酒店', city: '北京', star: 5, status: 'approved', price: 499 }
]

const columns = [
  { title: '酒店名称', dataIndex: 'name' },
  { title: '城市', dataIndex: 'city' },
  { title: '星级', dataIndex: 'star' },
  { title: '最低价', dataIndex: 'price' },
  {
    title: '状态',
    dataIndex: 'status',
    render: (value) => {
      const colorMap = { pending: 'orange', approved: 'green', rejected: 'red', offline: 'default' }
      return <Tag color={colorMap[value] || 'default'}>{value}</Tag>
    }
  },
  {
    title: '操作',
    render: () => (
      <Space>
        <Button type="link">编辑</Button>
        <Button type="link">下线</Button>
      </Space>
    )
  }
]

export default function Hotels() {
  return (
    <Card>
      <Typography.Title level={5}>酒店管理</Typography.Title>
      <Table columns={columns} dataSource={dataSource} pagination={{ pageSize: 5 }} />
    </Card>
  )
}
