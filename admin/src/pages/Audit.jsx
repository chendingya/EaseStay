import { Card, Table, Space, Typography, Tag } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EyeOutlined, StarFilled } from '@ant-design/icons'
import { GlassButton, TableFilterBar } from '../components'
import { api } from '../services'
import { useTranslation } from 'react-i18next'
import { useRemoteTableQuery } from '../hooks/useRemoteTableQuery'

export default function Audit() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [hotels, setHotels] = useState([])
  const [statusFilter, setStatusFilter] = useState('pending')
  const {
    page,
    pageSize,
    total,
    setTotal,
    setPage,
    handlePageChange
  } = useRemoteTableQuery({
    initialPageSize: 8
  })

  const statusMap = {
    pending: { color: 'orange', label: t('status.pending') },
    approved: { color: 'green', label: t('status.approved') },
    rejected: { color: 'red', label: t('status.rejected') },
    offline: { color: 'default', label: t('status.offline') }
  }

  const fetchHotels = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', String(page))
      params.append('pageSize', String(pageSize))
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)
      const data = await api.get(`/api/admin/hotels?${params.toString()}`)
      const list = Array.isArray(data?.list) ? data.list : (Array.isArray(data) ? data : [])
      const nextTotal = Array.isArray(data?.list)
        ? (Number(data?.total) || 0)
        : list.length
      setHotels(list)
      setTotal(nextTotal)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, setTotal, statusFilter])

  useEffect(() => {
    fetchHotels()
  }, [fetchHotels])

  const handleStatusChange = (value) => {
    setStatusFilter(value)
    setPage(1)
  }

  const handleRefresh = async () => {
    await fetchHotels()
  }

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
    >
      <TableFilterBar
        filterItems={[
          {
            key: 'status',
            span: 5,
            value: statusFilter,
            onChange: handleStatusChange,
            options: [
              { value: 'all', label: t('audit.filter.all') },
              { value: 'pending', label: t('status.pending') },
              { value: 'approved', label: t('status.approved') },
              { value: 'rejected', label: t('status.rejected') },
              { value: 'offline', label: t('status.offline') }
            ]
          }
        ]}
        onRefresh={handleRefresh}
        refreshLoading={loading}
        refreshText={t('common.refresh')}
      />
      <Table
        columns={columns}
        dataSource={hotels}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showQuickJumper: true,
          onChange: handlePageChange
        }}
      />
    </Card>
  )
}
