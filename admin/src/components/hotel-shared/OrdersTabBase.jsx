import { Card, Table } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassButton } from '../GlassUI'

export default function OrdersTabBase({
  hotelId,
  orders,
  loading,
  page,
  total,
  onPageChange,
  onViewStats,
  i18nPrefix,
  emptyTextKey
}) {
  const { t } = useTranslation()

  const orderColumns = useMemo(
    () => [
      { title: t(`${i18nPrefix}.id`), dataIndex: 'id', key: 'id', width: 90 },
      { title: t(`${i18nPrefix}.roomType`), dataIndex: 'room_type_name', key: 'room_type_name' },
      { title: t(`${i18nPrefix}.quantity`), dataIndex: 'quantity', key: 'quantity', width: 70 },
      {
        title: t(`${i18nPrefix}.price`),
        dataIndex: 'price_per_night',
        key: 'price_per_night',
        render: (price) => <span style={{ color: '#f5222d' }}>¥{price}</span>
      },
      { title: t(`${i18nPrefix}.nights`), dataIndex: 'nights', key: 'nights', width: 70 },
      {
        title: t(`${i18nPrefix}.totalPrice`),
        dataIndex: 'total_price',
        key: 'total_price',
        render: (price) => <span style={{ color: '#f5222d', fontWeight: 600 }}>¥{price}</span>
      },
      { title: t(`${i18nPrefix}.status`), dataIndex: 'status', key: 'status', width: 90 },
      {
        title: t(`${i18nPrefix}.checkIn`),
        dataIndex: 'check_in',
        key: 'check_in',
        render: (value) => value || '-'
      },
      {
        title: t(`${i18nPrefix}.createdAt`),
        dataIndex: 'created_at',
        key: 'created_at',
        render: (value) => (value ? new Date(value).toLocaleString() : '-')
      }
    ],
    [i18nPrefix, t]
  )

  return (
    <Card
      title={(
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{t(`${i18nPrefix}.title`)}</span>
          <GlassButton type="primary" onClick={() => onViewStats(hotelId)}>
            {t(`${i18nPrefix}.stats`)}
          </GlassButton>
        </div>
      )}
      style={{ marginBottom: 24 }}
    >
      <Table
        columns={orderColumns}
        dataSource={orders}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: 8,
          total,
          onChange: (nextPage) => onPageChange(nextPage)
        }}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: t(emptyTextKey) }}
      />
    </Card>
  )
}
