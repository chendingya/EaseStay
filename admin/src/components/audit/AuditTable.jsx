import { Space, Table, Tag } from 'antd'
import EyeOutlined from '@ant-design/icons/es/icons/EyeOutlined'
import StarFilled from '@ant-design/icons/es/icons/StarFilled'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassButton } from '../GlassButton'

export default function AuditTable({ hotels, loading, page, pageSize, total, onPageChange, onNavigateDetail }) {
  const { t } = useTranslation()

  const statusMap = useMemo(() => ({
    pending: { color: 'orange', label: t('status.pending') },
    approved: { color: 'green', label: t('status.approved') },
    rejected: { color: 'red', label: t('status.rejected') },
    offline: { color: 'default', label: t('status.offline') }
  }), [t])

  const columns = useMemo(() => [
    {
      title: t('audit.columns.name'),
      dataIndex: 'name',
      render: (text, record) => (
        <a onClick={() => onNavigateDetail(record.id)}>{text}</a>
      )
    },
    { title: t('audit.columns.city'), dataIndex: 'city' },
    {
      title: t('audit.columns.star'),
      dataIndex: 'star_rating',
      render: (value) => (value ? <span><StarFilled style={{ color: '#faad14' }} /> {t('audit.starLabel', { value })}</span> : '-')
    },
    {
      title: t('audit.columns.lowestPrice'),
      dataIndex: 'lowestPrice',
      render: (value) => (value ? <span style={{ color: '#f5222d' }}>¥{value}</span> : '-')
    },
    {
      title: t('audit.columns.createdAt'),
      dataIndex: 'created_at',
      render: (value) => (value ? value.split('T')[0] : '-')
    },
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
          <GlassButton type="link" icon={<EyeOutlined />} onClick={() => onNavigateDetail(record.id)}>
            {record.status === 'pending' ? t('audit.action.audit') : t('common.view')}
          </GlassButton>
        </Space>
      )
    }
  ], [onNavigateDetail, statusMap, t])

  return (
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
        onChange: onPageChange
      }}
    />
  )
}
