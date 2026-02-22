import { Card, Image, Space, Table, Tag, Typography } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassButton } from '../GlassUI'
import { estimateActionColumnWidth } from '../../utils/tableWidth'

export default function RoomsTab({ roomTypes = [], formatPeriodLabel, onOpenDiscount, onCancelDiscount }) {
  const { t } = useTranslation()

  const getRoomImages = (room) => {
    const candidates = [room?.images, room?.image_urls, room?.room_images]
    for (const source of candidates) {
      if (Array.isArray(source) && source.length > 0) {
        return source.filter(Boolean)
      }
    }
    return []
  }

  const roomActionColumnWidth = useMemo(
    () =>
      estimateActionColumnWidth([[t('hotelDetail.room.setDiscount'), t('hotelDetail.room.cancelDiscount')]], {
        minColumnWidth: 180,
        maxColumnWidth: 380
      }),
    [t]
  )

  const roomColumns = useMemo(
    () => [
      { title: t('hotelDetail.room.name'), dataIndex: 'name', key: 'name' },
      { title: t('hotelDetail.room.capacity'), dataIndex: 'capacity', key: 'capacity', width: 80, render: (v) => (v ? t('hotelDetail.room.capacityValue', { value: v }) : '-') },
      { title: t('hotelDetail.room.bedWidth'), dataIndex: 'bed_width', key: 'bed_width', width: 80, render: (v) => (v ? t('hotelDetail.room.bedWidthValue', { value: v }) : '-') },
      { title: t('hotelDetail.room.area'), dataIndex: 'area', key: 'area', width: 80, render: (v) => (v ? t('hotelDetail.room.areaValue', { value: v }) : '-') },
      { title: t('hotelDetail.room.ceiling'), dataIndex: 'ceiling_height', key: 'ceiling_height', width: 80, render: (v) => (v ? t('hotelDetail.room.ceilingValue', { value: v }) : '-') },
      {
        title: t('hotelDetail.room.images'),
        dataIndex: 'images',
        key: 'images',
        width: 180,
        render: (_, record) => {
          const images = getRoomImages(record)
          if (!images.length) return <Typography.Text type="secondary">{t('hotelDetail.room.noImages')}</Typography.Text>
          const preview = images.slice(0, 3)
          return (
            <Image.PreviewGroup>
              <Space size={6} wrap>
                {preview.map((url, idx) => (
                  <Image
                    key={`${record.id || record.name}-img-${idx}`}
                    src={url}
                    width={44}
                    height={32}
                    style={{ objectFit: 'cover', borderRadius: 4 }}
                  />
                ))}
                {images.length > 3 && <Tag>{`+${images.length - 3}`}</Tag>}
              </Space>
            </Image.PreviewGroup>
          )
        }
      },
      {
        title: t('hotelDetail.room.price'),
        dataIndex: 'display_price',
        key: 'price',
        render: (_, record) => {
          const basePrice = Number(record.base_price)
          const currentPrice = Number(record.display_price)
          const hasBasePrice = Number.isFinite(basePrice)
          const hasCurrentPrice = Number.isFinite(currentPrice)

          return (
            <div>
              <div style={{ color: '#999' }}>{hasBasePrice ? t('hotelDetail.room.basePrice', { value: basePrice }) : '-'}</div>
              <div style={{ color: '#f5222d', fontWeight: 600 }}>{hasCurrentPrice ? t('hotelDetail.room.currentPrice', { value: currentPrice }) : '-'}</div>
            </div>
          )
        }
      },
      {
        title: t('hotelDetail.room.discount'),
        key: 'discount',
        render: (_, record) => {
          const tags = []
          const discountRate = Number(record?.discount_rate) || 0
          const discountQuota = Number(record?.discount_quota) || 0
          if (record?.has_room_discount) {
            const period = formatPeriodLabel(record.discount_periods)
            tags.push(
              <Tag color="purple" key={`batch-${record.id || record.name}`}>
                {discountRate > 0
                  ? t('hotelDetail.room.batchDiscountRate', { rate: discountRate, quota: discountQuota })
                  : t('hotelDetail.room.batchDiscountAmount', { value: Math.abs(discountRate), quota: discountQuota })}
                {period ? ` · ${period}` : ''}
              </Tag>
            )
          }
          const effectivePromos = Array.isArray(record?.effective_promotions) ? record.effective_promotions : []
          effectivePromos.forEach((promo, index) => {
            tags.push(
              <Tag color="blue" key={`promo-${record.id || record.name}-${index}`}>
                {promo.title || promo.type || t('hotelDetail.promo.fallback')}
              </Tag>
            )
          })
          return tags.length ? <Space size={[4, 4]} wrap>{tags}</Space> : <Tag>{t('hotelDetail.room.noDiscount')}</Tag>
        }
      },
      { title: t('hotelDetail.room.stock'), dataIndex: 'stock', key: 'stock' },
      { title: t('hotelDetail.room.wifi'), dataIndex: 'wifi', key: 'wifi', width: 70, render: (v) => (v === true ? t('hotelDetail.room.wifiYes') : v === false ? t('hotelDetail.room.wifiNo') : '-') },
      {
        title: t('hotelDetail.room.breakfast'),
        dataIndex: 'breakfast_included',
        key: 'breakfast_included',
        width: 70,
        render: (v) => (v === true ? t('hotelDetail.room.breakfastYes') : v === false ? t('hotelDetail.room.breakfastNo') : '-')
      },
      {
        title: t('hotelDetail.room.used'),
        dataIndex: 'used_stock',
        key: 'used_stock',
        render: (value) => value || 0
      },
      {
        title: t('hotelDetail.room.available'),
        key: 'available',
        render: (_, record) => {
          const stock = Number(record.stock) || 0
          const used = Number(record.used_stock) || 0
          const active = record.is_active !== false
          return active ? Math.max(stock - used, 0) : 0
        }
      },
      {
        title: t('hotelDetail.room.action'),
        key: 'action',
        width: roomActionColumnWidth,
        render: (_, record) => {
          const discountRate = Number(record.discount_rate) || 0
          const discountQuota = Number(record.discount_quota) || 0
          const hasDiscount = discountQuota > 0 && ((discountRate > 0 && discountRate <= 10) || discountRate < 0)
          return (
            <Space size={[4, 4]} wrap>
              <GlassButton type="link" size="small" onClick={() => onOpenDiscount(record)}>
                {t('hotelDetail.room.setDiscount')}
              </GlassButton>
              <GlassButton type="link" size="small" danger disabled={!hasDiscount} onClick={() => onCancelDiscount(record)}>
                {t('hotelDetail.room.cancelDiscount')}
              </GlassButton>
            </Space>
          )
        }
      }
    ],
    [t, formatPeriodLabel, onOpenDiscount, onCancelDiscount, roomActionColumnWidth]
  )

  return (
    <Card style={{ marginBottom: 24 }}>
      <Table
        columns={roomColumns}
        dataSource={roomTypes}
        rowKey="id"
        pagination={false}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: t('hotelDetail.emptyRooms') }}
      />
    </Card>
  )
}
