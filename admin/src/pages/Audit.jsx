import { Card, Table, Space, Typography, Tag, Select } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EyeOutlined, StarFilled } from '@ant-design/icons'
import { GlassButton } from '../components'
import { api } from '../services'
import { useTranslation } from 'react-i18next'

export default function Audit() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [hotels, setHotels] = useState([])
  const [statusFilter, setStatusFilter] = useState('pending')

  const statusMap = {
    pending: { color: 'orange', label: t('status.pending') },
    approved: { color: 'green', label: t('status.approved') },
    rejected: { color: 'red', label: t('status.rejected') },
    offline: { color: 'default', label: t('status.offline') }
  }

  const fetchHotels = useCallback(async () => {
    setLoading(true)
    try {
      const query = statusFilter && statusFilter !== 'all' ? `?status=${statusFilter}` : ''
      const data = await api.get(`/api/admin/hotels${query}`)
      setHotels(data)
    } catch (error) {
      console.error('获取审核列表失败:', error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchHotels()
  }, [fetchHotels])

  const columns = [
    { title: t('audit.columns.name'), dataIndex: 'name', render: (text, record) => (
      <a onClick={() => navigate(`/audit/${record.id}`)}>{text}</a>
    )},
    { title: t('audit.columns.city'), dataIndex: 'city' },
    { title: t('audit.columns.star'), dataIndex: 'star_rating', render: v => v ? <span><StarFilled style={{ color: '#faad14' }} /> {t('audit.starLabel', { value: v })}</span> : '-' },
    { title: t('audit.columns.lowestPrice'), dataIndex: 'lowestPrice', render: v => v ? <span style={{ color: '#f5222d' }}>¥{v}</span> : '-' },
    { title: t('audit.columns.createdAt'), dataIndex: 'created_at', render: v => v ? v.split('T')[0] : '-' },
    {
      title: t('audit.columns.status'),
      dataIndex: 'status',
      render: (value) => {
        const info = statusMap[value] || { color: 'default', label: value }
        return <Tag color={info.color}>{info.label}</Tag>
      }
    },
    {
      title: t('audit.columns.action'),
      render: (_, record) => (
        <Space>
          <GlassButton type="link" icon={<EyeOutlined />} onClick={() => navigate(`/audit/${record.id}`)}>
            {record.status === 'pending' ? t('audit.action.audit') : t('common.view')}
          </GlassButton>
        </Space>
      )
    }
  ]

  return (
    <Card
      title={<Typography.Title level={5} style={{ margin: 0 }}>{t('audit.title')}</Typography.Title>}
      extra={(
        <Select
          value={statusFilter}
          style={{ width: 160 }}
          onChange={setStatusFilter}
          options={[
            { value: 'all', label: t('audit.filter.all') },
            { value: 'pending', label: t('status.pending') },
            { value: 'approved', label: t('status.approved') },
            { value: 'rejected', label: t('status.rejected') },
            { value: 'offline', label: t('status.offline') }
          ]}
        />
      )}
    >
      <Table columns={columns} dataSource={hotels} rowKey="id" loading={loading} pagination={{ pageSize: 8 }} />
    </Card>
  )
}
