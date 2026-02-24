import { Card, Image, Space, Table, Tag, Typography } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassButton } from '../GlassButton'
import { estimateActionColumnWidth } from '../../utils/tableWidth'

function getRoomImages(room) {
  const candidates = [room?.images, room?.image_urls, room?.room_images]
  for (const source of candidates) {
    if (Array.isArray(source) && source.length > 0) {
      return source.filter(Boolean)
    }
  }
  return []
}

export default function RoomsTabBase({
  roomTypes = [],
  formatPeriodLabel,
  i18nPrefix,
  emptyTextKey,
  promoFallbackKey,
  showStatusColumn = false,
  showActionColumn = false,
  onOpenDiscount,
  onCancelDiscount,
  actionSetKey,
  actionCancelKey,
  wifiYesKey,
  wifiNoKey,
  breakfastYesKey,
  breakfastNoKey
}) {
  const { t } = useTranslation()

  const roomActionColumnWidth = useMemo(() => {
    if (!showActionColumn || !actionSetKey || !actionCancelKey) return 180
    return estimateActionColumnWidth([[t(actionSetKey), t(actionCancelKey)]], {
      minColumnWidth: 180,
      maxColumnWidth: 380
    })
  }, [actionCancelKey, actionSetKey, showActionColumn, t])

  const roomColumns = useMemo(() => {
    const cols = [
      { title: t(`${i18nPrefix}.name`), dataIndex: 'name', key: 'name' }
    ]

    if (showStatusColumn) {
      cols.push({
        title: t(`${i18nPrefix}.status`),
        dataIndex: 'is_active',
        key: 'is_active',
        width: 80,
        render: (active) => (
          active === false
            ? <Tag color="default">{t(`${i18nPrefix}.offline`)}</Tag>
            : <Tag color="green">{t(`${i18nPrefix}.online`)}</Tag>
        )
      })
    }

    cols.push(
      {
        title: t(`${i18nPrefix}.capacity`),
        dataIndex: 'capacity',
        key: 'capacity',
        width: 80,
        render: (v) => (v ? t(`${i18nPrefix}.capacityValue`, { value: v }) : '-')
      },
      {
        title: t(`${i18nPrefix}.bedWidth`),
        dataIndex: 'bed_width',
        key: 'bed_width',
        width: 80,
        render: (v) => (v ? t(`${i18nPrefix}.bedWidthValue`, { value: v }) : '-')
      },
      {
        title: t(`${i18nPrefix}.area`),
        dataIndex: 'area',
        key: 'area',
        width: 80,
        render: (v) => (v ? t(`${i18nPrefix}.areaValue`, { value: v }) : '-')
      },
      {
        title: t(`${i18nPrefix}.ceiling`),
        dataIndex: 'ceiling_height',
        key: 'ceiling_height',
        width: 80,
        render: (v) => (v ? t(`${i18nPrefix}.ceilingValue`, { value: v }) : '-')
      },
      {
        title: t(`${i18nPrefix}.images`),
        dataIndex: 'images',
        key: 'images',
        width: 180,
        render: (_, record) => {
          const images = getRoomImages(record)
          if (!images.length) return <Typography.Text type="secondary">{t(`${i18nPrefix}.noImages`)}</Typography.Text>
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
                    loading={idx === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                  />
                ))}
                {images.length > 3 && <Tag>{`+${images.length - 3}`}</Tag>}
              </Space>
            </Image.PreviewGroup>
          )
        }
      },
      {
        title: t(`${i18nPrefix}.price`),
        dataIndex: 'display_price',
        key: 'price',
        render: (_, record) => {
          const basePrice = Number(record.base_price)
          const currentPrice = Number(record.display_price)
          const hasBasePrice = Number.isFinite(basePrice)
          const hasCurrentPrice = Number.isFinite(currentPrice)
          return (
            <div>
              <div style={{ color: '#999' }}>
                {hasBasePrice ? t(`${i18nPrefix}.basePrice`, { value: basePrice }) : '-'}
              </div>
              <div style={{ color: '#f5222d', fontWeight: 600 }}>
                {hasCurrentPrice ? t(`${i18nPrefix}.currentPrice`, { value: currentPrice }) : '-'}
              </div>
            </div>
          )
        }
      },
      {
        title: t(`${i18nPrefix}.discount`),
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
                  ? t(`${i18nPrefix}.batchDiscountRate`, { count: discountRate, rate: discountRate, quota: discountQuota })
                  : t(`${i18nPrefix}.batchDiscountAmount`, { count: Math.abs(discountRate), value: Math.abs(discountRate), quota: discountQuota })}
                {period ? ` · ${period}` : ''}
              </Tag>
            )
          }
          const effectivePromos = Array.isArray(record?.effective_promotions) ? record.effective_promotions : []
          effectivePromos.forEach((promo, index) => {
            tags.push(
              <Tag color="blue" key={`promo-${record.id || record.name}-${index}`}>
                {promo.title || promo.type || t(promoFallbackKey)}
              </Tag>
            )
          })
          return tags.length ? <Space size={[4, 4]} wrap>{tags}</Space> : <Tag>{t(`${i18nPrefix}.noDiscount`)}</Tag>
        }
      },
      { title: t(`${i18nPrefix}.stock`), dataIndex: 'stock', key: 'stock' },
      {
        title: t(`${i18nPrefix}.wifi`),
        dataIndex: 'wifi',
        key: 'wifi',
        width: 70,
        render: (v) => (v === true ? t(wifiYesKey) : v === false ? t(wifiNoKey) : '-')
      },
      {
        title: t(`${i18nPrefix}.breakfast`),
        dataIndex: 'breakfast_included',
        key: 'breakfast_included',
        width: 70,
        render: (v) => (v === true ? t(breakfastYesKey) : v === false ? t(breakfastNoKey) : '-')
      },
      {
        title: t(`${i18nPrefix}.used`),
        dataIndex: 'used_stock',
        key: 'used_stock',
        render: (value) => value || 0
      },
      {
        title: t(`${i18nPrefix}.available`),
        key: 'available',
        render: (_, record) => {
          const stock = Number(record.stock) || 0
          const used = Number(record.used_stock) || 0
          const active = record.is_active !== false
          return active ? Math.max(stock - used, 0) : 0
        }
      }
    )

    if (showActionColumn) {
      cols.push({
        title: t(`${i18nPrefix}.action`),
        key: 'action',
        width: roomActionColumnWidth,
        render: (_, record) => {
          const discountRate = Number(record.discount_rate) || 0
          const discountQuota = Number(record.discount_quota) || 0
          const hasDiscount = discountQuota > 0 && ((discountRate > 0 && discountRate <= 10) || discountRate < 0)
          return (
            <Space size={[4, 4]} wrap>
              <GlassButton type="link" size="small" onClick={() => onOpenDiscount?.(record)}>
                {t(actionSetKey)}
              </GlassButton>
              <GlassButton type="link" size="small" danger disabled={!hasDiscount} onClick={() => onCancelDiscount?.(record)}>
                {t(actionCancelKey)}
              </GlassButton>
            </Space>
          )
        }
      })
    }

    return cols
  }, [
    actionCancelKey,
    actionSetKey,
    breakfastNoKey,
    breakfastYesKey,
    formatPeriodLabel,
    i18nPrefix,
    onCancelDiscount,
    onOpenDiscount,
    promoFallbackKey,
    roomActionColumnWidth,
    showActionColumn,
    showStatusColumn,
    t,
    wifiNoKey,
    wifiYesKey
  ])

  return (
    <Card style={{ marginBottom: 24 }}>
      <Table
        columns={roomColumns}
        dataSource={roomTypes}
        rowKey="id"
        pagination={false}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: t(emptyTextKey) }}
      />
    </Card>
  )
}
