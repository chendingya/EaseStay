import { Space, Table, Tag } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import UserOutlined from '@ant-design/icons/es/icons/UserOutlined'
import ShopOutlined from '@ant-design/icons/es/icons/ShopOutlined'
import EyeOutlined from '@ant-design/icons/es/icons/EyeOutlined'
import KeyOutlined from '@ant-design/icons/es/icons/KeyOutlined'
import { GlassButton } from '../GlassButton'

export default function MerchantsTable({
  merchants,
  loading,
  page,
  pageSize,
  total,
  onPageChange,
  onNavigateDetail,
  onOpenResetPassword
}) {
  const { t } = useTranslation()

  const columns = useMemo(() => ([
    {
      title: t('merchants.columns.username'),
      dataIndex: 'username',
      render: (text) => (
        <Space>
          <UserOutlined />
          <span>{text}</span>
        </Space>
      )
    },
    {
      title: t('merchants.columns.hotelCount'),
      dataIndex: 'hotelCount',
      render: (count, record) => (
        <Space>
          <ShopOutlined />
          <span>{t('merchants.hotelCountValue', { count })}</span>
          {record.approvedCount > 0 && (
            <Tag color="green">{t('merchants.approvedCountValue', { count: record.approvedCount })}</Tag>
          )}
        </Space>
      )
    },
    {
      title: t('merchants.columns.createdAt'),
      dataIndex: 'created_at',
      render: (value) => (value ? new Date(value).toLocaleDateString('zh-CN') : '-')
    },
    {
      title: t('merchants.columns.action'),
      render: (_, record) => (
        <Space>
          <GlassButton
            type="link"
            icon={<EyeOutlined />}
            onClick={() => onNavigateDetail(record.id)}
          >
            {t('common.view')}
          </GlassButton>
          <GlassButton
            type="link"
            icon={<KeyOutlined />}
            onClick={() => onOpenResetPassword(record)}
          >
            {t('merchants.actions.resetPassword')}
          </GlassButton>
        </Space>
      )
    }
  ]), [onNavigateDetail, onOpenResetPassword, t])

  return (
    <Table
      columns={columns}
      dataSource={merchants}
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
