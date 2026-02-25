import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Form, Input, InputNumber, Select, Space, Typography, Divider, DatePicker,
  Row, Col, Spin, Image, Tag, Table, Descriptions, Tabs, Upload, Modal, Badge, Card, Checkbox, Tooltip, Tour, Affix
} from 'antd'
import EyeOutlined from '@ant-design/icons/es/icons/EyeOutlined'
import EditOutlined from '@ant-design/icons/es/icons/EditOutlined'
import StarFilled from '@ant-design/icons/es/icons/StarFilled'
import EnvironmentOutlined from '@ant-design/icons/es/icons/EnvironmentOutlined'
import CalendarOutlined from '@ant-design/icons/es/icons/CalendarOutlined'
import PlusOutlined from '@ant-design/icons/es/icons/PlusOutlined'
import DeleteOutlined from '@ant-design/icons/es/icons/DeleteOutlined'
import SearchOutlined from '@ant-design/icons/es/icons/SearchOutlined'
import QuestionCircleOutlined from '@ant-design/icons/es/icons/QuestionCircleOutlined'
import { GlassButton, glassMessage as message } from '../components'
import { api } from '../services'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'

// ========== 地图选择组件 ==========
function MapPicker({ onAddressChange }) {
  const { t } = useTranslation()
  const [searchText, setSearchText] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [searching, setSearching] = useState(false)

  // 通过后端 API 搜索地点
  const handleSearch = async () => {
    if (!searchText.trim()) return
    
    setSearching(true)
    try {
      const result = await api.get(`/api/map/search?keywords=${encodeURIComponent(searchText)}`)
      
      if (result.success && result.data && result.data.length > 0) {
        const results = result.data.map(poi => {
          const [lng, lat] = (poi.location || '121.47,31.23').split(',')
          return {
            name: poi.name,
            address: poi.address || poi.pname + poi.cityname + poi.adname,
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            city: poi.cityname,
            district: poi.adname
          }
        })
        setSearchResults(results)
        setShowResults(true)
      } else {
        message.warning(result.message || t('hotelEdit.map.noResult'))
        setSearchResults([])
      }
    } catch (err) {
      console.error(err)
      message.error(t('hotelEdit.map.searchError'))
    } finally {
      setSearching(false)
    }
  }

  const handleSelectLocation = (location) => {
    setShowResults(false)
    setSearchText(location.name)
    onAddressChange?.({ 
      city: location.city || searchText, 
      address: location.address,
      lat: location.lat,
      lng: location.lng
    })
  }

  return (
    <Card size="small" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 12 }}>
        <Row gutter={8}>
          <Col flex="auto">
            <Input
              placeholder={t('hotelEdit.map.searchPlaceholder')}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col>
            <Tooltip title={t('hotelEdit.tips.tooltip.mapSearch')}>
              <GlassButton onClick={handleSearch} loading={searching}>{t('hotelEdit.map.searchButton')}</GlassButton>
            </Tooltip>
          </Col>
        </Row>

        {showResults && searchResults.length > 0 && (
          <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, maxHeight: 200, overflow: 'auto' }}>
            {searchResults.map((item, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectLocation(item)}
                style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: idx < searchResults.length - 1 ? '1px solid #f0f0f0' : 'none' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ fontWeight: 500 }}>{item.name}</div>
                <div style={{ fontSize: 12, color: '#999' }}>{item.address}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

// ========== 图片上传组件 ==========
function ImageUploader({ value = [], onChange }) {
  const { t } = useTranslation()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewImage, setPreviewImage] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)

  const fileList = value.map((url, idx) => ({ uid: `-${idx}`, name: t('hotelEdit.imageUploader.imageName', { index: idx + 1 }), status: 'done', url }))

  const handlePreview = (file) => {
    setPreviewImage(file.url)
    setPreviewOpen(true)
  }

  const handleRemove = (file) => {
    onChange?.(value.filter((url) => url !== file.url))
  }

  const handleUpload = ({ onSuccess }) => {
    setTimeout(() => {
      const fakeUrl = `https://picsum.photos/800/600?random=${Date.now()}`
      onChange?.([...value, fakeUrl])
      onSuccess?.('ok')
      message.success(t('hotelEdit.imageUploader.uploadSuccess'))
    }, 1000)
  }

  const handleAddUrl = () => {
    if (!urlInput.trim()) return
    if (!urlInput.startsWith('http')) {
      message.error(t('hotelEdit.imageUploader.invalidUrl'))
      return
    }
    onChange?.([...value, urlInput.trim()])
    setUrlInput('')
    setShowUrlInput(false)
    message.success(t('hotelEdit.imageUploader.addSuccess'))
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 12 }}>
        <Upload
          listType="picture-card"
          fileList={fileList}
          onPreview={handlePreview}
          onRemove={handleRemove}
          customRequest={handleUpload}
          accept="image/*"
          multiple
        >
          {fileList.length < 10 && (
            <div><PlusOutlined /><div style={{ marginTop: 8 }}>{t('hotelEdit.imageUploader.uploadButton')}</div></div>
          )}
        </Upload>

        {showUrlInput ? (
          <Row gutter={8}>
            <Col flex="auto">
              <Input placeholder={t('hotelEdit.imageUploader.urlPlaceholder')} value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onPressEnter={handleAddUrl} />
            </Col>
            <Col><GlassButton onClick={handleAddUrl}>{t('hotelEdit.imageUploader.addButton')}</GlassButton></Col>
            <Col><GlassButton onClick={() => setShowUrlInput(false)}>{t('hotelEdit.imageUploader.cancelButton')}</GlassButton></Col>
          </Row>
        ) : (
          <GlassButton type="dashed" icon={<PlusOutlined />} onClick={() => setShowUrlInput(true)} block>
            {t('hotelEdit.imageUploader.addUrl')}
          </GlassButton>
        )}
      </div>
      <Modal open={previewOpen} footer={null} onCancel={() => setPreviewOpen(false)}>
        <img alt={t('hotelEdit.imageUploader.previewAlt')} style={{ width: '100%' }} src={previewImage} />
      </Modal>
    </>
  )
}

// ========== 设施标签选择器 ==========
function FacilitySelector({ value = [], onChange, pendingRequests = [], approvedRequests = [], onRequestNew, onReuseApproved, presetFacilities = [] }) {
  const { t } = useTranslation()
  const [customFacility, setCustomFacility] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  const facilityNames = presetFacilities.map(f => f.name || f)

  const handleToggle = (facility) => {
    onChange?.(value.includes(facility) ? value.filter(f => f !== facility) : [...value, facility])
  }

  const handleRequestNew = () => {
    if (!customFacility.trim()) { message.error(t('hotelEdit.facility.customRequired')); return }
    if (facilityNames.includes(customFacility) || value.includes(customFacility)) { message.warning(t('hotelEdit.facility.exists')); return }
    onRequestNew?.(customFacility)
    setCustomFacility('')
    setShowCustomInput(false)
    message.success(t('hotelEdit.facility.requestSuccess'))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 12 }}>
      <div>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.facility.presetTitle')}</Typography.Text>
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {facilityNames.map(facility => (
            <Tag key={facility} color={value.includes(facility) ? 'blue' : 'default'} style={{ cursor: 'pointer', padding: '4px 12px' }} onClick={() => handleToggle(facility)}>
              {value.includes(facility) && t('hotelEdit.facility.selectedPrefix')}{facility}
            </Tag>
          ))}
        </div>
      </div>

      {approvedRequests.length > 0 && (
        <div style={{ padding: '8px 12px', background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.facility.approvedTitle')}</Typography.Text>
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {approvedRequests.map((req, idx) => {
              const exists = value.includes(req.name)
              return (
                <Tag
                  key={`${req.id || req.name}-${idx}`}
                  color={exists ? 'default' : 'green'}
                  style={{ cursor: 'pointer', margin: 0 }}
                  onClick={() => onReuseApproved?.(req, exists ? 'remove' : 'add')}
                >
                  {req.name}{exists ? t('hotelEdit.facility.approvedRemoveHint') : ''}
                </Tag>
              )
            })}
          </div>
        </div>
      )}

      {pendingRequests.length > 0 && (
        <div style={{ padding: '8px 12px', background: '#fffbe6', borderRadius: 8, border: '1px solid #ffe58f' }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.facility.pendingTitle')}</Typography.Text>
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {pendingRequests.map((req, idx) => (
              <Tag key={idx} color="orange" style={{ margin: 0 }}>
                {req.name} {t('hotelEdit.facility.pendingStatus')}
              </Tag>
            ))}
          </div>
        </div>
      )}

      {showCustomInput ? (
        <Row gutter={8}>
          <Col flex="auto"><Input placeholder={t('hotelEdit.facility.customPlaceholder')} value={customFacility} onChange={(e) => setCustomFacility(e.target.value)} onPressEnter={handleRequestNew} /></Col>
          <Col><GlassButton type="primary" onClick={handleRequestNew}>{t('hotelEdit.facility.requestButton')}</GlassButton></Col>
          <Col><GlassButton onClick={() => setShowCustomInput(false)}>{t('hotelEdit.facility.cancelButton')}</GlassButton></Col>
        </Row>
      ) : (
        <GlassButton type="dashed" icon={<PlusOutlined />} onClick={() => setShowCustomInput(true)}>{t('hotelEdit.facility.requestNew')}</GlassButton>
      )}
    </div>
  )
}

// ========== 房型管理组件 ==========
function RoomTypeManager({ value = [], onChange, pendingRequests = [], approvedRequests = [], onRequestNew, onReuseApproved, presetRoomTypes = [] }) {
  const { t } = useTranslation()
  const [showPresets, setShowPresets] = useState(false)
  const [customRoom, setCustomRoom] = useState({ name: '', price: 0, stock: 10, capacity: 2, bed_width: 180, area: 20, ceiling_height: 2.8, wifi: true, breakfast_included: false, images: [] })
  const [showCustomInput, setShowCustomInput] = useState(false)
  const safeValue = Array.isArray(value) ? value : []

  const handleAddPreset = (preset) => {
    const nextRoom = {
      name: preset.name,
      price: preset.default_price || preset.defaultPrice,
      stock: 10,
      capacity: preset.capacity ?? 2,
      bed_width: preset.bed_width ?? 180,
      area: preset.area ?? 20,
      ceiling_height: preset.ceiling_height ?? 2.8,
      wifi: preset.wifi ?? true,
      breakfast_included: preset.breakfast_included ?? false,
      images: [],
      is_active: true
    }
    const nextValue = [...safeValue, nextRoom]
    console.log('[RoomType][PresetAdd]', { preset, nextRoom, nextValue })
    onChange?.(nextValue)
    message.success(t('hotelEdit.roomType.presetAdded', { name: preset.name }))
  }

  const handleDeactivate = (index) => {
    const room = safeValue[index] || {}
    const stock = Number(room.stock) || 0
    const used = Number(room.used_stock) || 0
    const active = room.is_active !== false
    const available = active ? Math.max(stock - used, 0) : 0
    const roomName = room.name || t('hotelEdit.roomType.defaultName', { index: index + 1 })
    const hasOrders = room.has_orders === true
    const isPersisted = !!room.id
    const actionText = isPersisted ? t('hotelEdit.roomType.actions.offline') : t('hotelEdit.roomType.actions.delete')
    Modal.confirm({
      title: t('hotelEdit.roomType.deactivateTitle', { action: actionText, name: roomName }),
      content: (
        <div style={{ marginTop: 8 }}>
          <Typography.Text type="secondary">{t('hotelEdit.roomType.deactivateHint')}</Typography.Text>
          <div style={{ marginTop: 8 }}>
            <Typography.Text type="secondary">
              {hasOrders ? t('hotelEdit.roomType.deactivateHasOrders') : t('hotelEdit.roomType.deactivateNoOrders')}
            </Typography.Text>
          </div>
          <div style={{ marginTop: 8 }}>
            <Typography.Text type="secondary">{t('hotelEdit.roomType.stockInfo', { stock, used, available })}</Typography.Text>
          </div>
        </div>
      ),
      okText: actionText,
      okButtonProps: { danger: true },
      cancelText: t('hotelEdit.roomType.cancel'),
      onOk() {
        if (isPersisted) {
          const nextValue = [...safeValue]
          nextValue[index] = { ...room, is_active: false }
          onChange?.(nextValue)
          return
        }
        onChange?.(safeValue.filter((_, idx) => idx !== index))
      }
    })
  }

  const handleRestore = (index) => {
    const room = safeValue[index] || {}
    const nextValue = [...safeValue]
    nextValue[index] = { ...room, is_active: true }
    onChange?.(nextValue)
  }

  const handleChange = (index, field, val) => {
    const newValue = [...safeValue]
    const currentRoom = newValue[index]
    newValue[index] = { ...currentRoom, [field]: val }
    onChange?.(newValue)
  }

  const handleRequestNew = () => {
    if (!customRoom.name.trim()) { message.error(t('hotelEdit.roomType.nameRequired')); return }
    const nextRoom = {
      name: customRoom.name.trim(),
      price: Number(customRoom.price) || 0,
      stock: Number(customRoom.stock) || 0,
      capacity: Number(customRoom.capacity) || 0,
      bed_width: Number(customRoom.bed_width) || 0,
      area: Number(customRoom.area) || 0,
      ceiling_height: Number(customRoom.ceiling_height) || 0,
      wifi: !!customRoom.wifi,
      breakfast_included: !!customRoom.breakfast_included,
      images: Array.isArray(customRoom.images) ? customRoom.images : [],
      is_active: true
    }
    const existingIndex = safeValue.findIndex((room) => room && room.name === nextRoom.name)
    if (existingIndex >= 0) {
      const updatedValue = [...safeValue]
      updatedValue[existingIndex] = { ...updatedValue[existingIndex], ...nextRoom }
      onChange?.(updatedValue)
    } else {
      onChange?.([...safeValue, nextRoom])
    }
    onRequestNew?.(nextRoom)
    setCustomRoom({ name: '', price: 0, stock: 10, capacity: 2, bed_width: 180, area: 20, ceiling_height: 2.8, wifi: true, breakfast_included: false, images: [] })
    setShowCustomInput(false)
    message.success(t('hotelEdit.roomType.requestSuccess'))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 12 }}>
      {safeValue.map((room, index) => {
        const stock = Number(room.stock) || 0
        const used = Number(room.used_stock) || 0
        const active = room.is_active !== false
        const available = active ? Math.max(stock - used, 0) : 0
        const summaryParts = [
          (room.capacity ?? 2) ? t('hotelEdit.roomType.summary.capacity', { value: room.capacity ?? 2 }) : null,
          (room.bed_width ?? 180) ? t('hotelEdit.roomType.summary.bedWidth', { value: room.bed_width ?? 180 }) : null,
          (room.area ?? 20) ? t('hotelEdit.roomType.summary.area', { value: room.area ?? 20 }) : null,
          (room.ceiling_height ?? 2.8) ? t('hotelEdit.roomType.summary.ceiling', { value: room.ceiling_height ?? 2.8 }) : null,
          (room.wifi ?? true) ? t('hotelEdit.roomType.summary.wifi') : t('hotelEdit.roomType.summary.noWifi'),
          (room.breakfast_included ?? false) ? t('hotelEdit.roomType.summary.breakfast') : t('hotelEdit.roomType.summary.noBreakfast')
        ].filter(Boolean)
        return (
          <Card key={index} size="small" styles={{ body: { padding: 12 } }} style={{ borderRadius: 12, border: '1px solid #f0f0f0', background: '#fafafa' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag color="purple" style={{ margin: 0 }}>{t('hotelEdit.roomType.summary.roomTag', { index: index + 1 })}</Tag>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {summaryParts.join(' · ')} · {t('hotelEdit.roomType.stockInfo', { stock, used, available })}
                </Typography.Text>
                {!active && <Tag color="default">{t('hotelEdit.roomType.summary.statusOffline')}</Tag>}
              </div>
              <Space size={4}>
                {!active && <GlassButton type="link" onClick={() => handleRestore(index)}>{t('hotelEdit.roomType.restore')}</GlassButton>}
                <GlassButton type="link" danger icon={<DeleteOutlined />} onClick={() => handleDeactivate(index)}>
                  {room.id ? t('hotelEdit.roomType.actions.offline') : t('hotelEdit.roomType.actions.delete')}
                </GlassButton>
              </Space>
            </div>
            <Row gutter={[12, 12]}>
              <Col flex="220px">
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.roomType.labelName')}</Typography.Text>
                <Input value={room.name} onChange={(e) => handleChange(index, 'name', e.target.value)} placeholder={t('hotelEdit.roomType.placeholderName')} style={{ marginTop: 6 }} />
              </Col>
              <Col flex="180px">
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.roomType.labelPrice')}</Typography.Text>
                <InputNumber value={room.price} onChange={(val) => handleChange(index, 'price', val)} min={0} style={{ width: '100%', marginTop: 6 }} prefix="¥" placeholder={t('hotelEdit.roomType.placeholderPrice')} />
              </Col>
              <Col flex="140px">
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.roomType.labelStock')}</Typography.Text>
                <InputNumber value={room.stock} onChange={(val) => handleChange(index, 'stock', val)} min={0} style={{ width: '100%', marginTop: 6 }} placeholder={t('hotelEdit.roomType.placeholderStock')} />
              </Col>
              <Col flex="140px">
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.roomType.labelCapacity')}</Typography.Text>
                <InputNumber value={room.capacity ?? 2} onChange={(val) => handleChange(index, 'capacity', val)} min={0} style={{ width: '100%', marginTop: 6 }} placeholder={t('hotelEdit.roomType.placeholderCapacity')} />
              </Col>
              <Col flex="140px">
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.roomType.labelBedWidth')}</Typography.Text>
                <InputNumber value={room.bed_width ?? 180} onChange={(val) => handleChange(index, 'bed_width', val)} min={0} style={{ width: '100%', marginTop: 6 }} placeholder={t('hotelEdit.roomType.placeholderBedWidth')} />
              </Col>
              <Col flex="140px">
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.roomType.labelArea')}</Typography.Text>
                <InputNumber value={room.area ?? 20} onChange={(val) => handleChange(index, 'area', val)} min={0} style={{ width: '100%', marginTop: 6 }} placeholder={t('hotelEdit.roomType.placeholderArea')} />
              </Col>
              <Col flex="140px">
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.roomType.labelCeiling')}</Typography.Text>
                <InputNumber value={room.ceiling_height ?? 2.8} onChange={(val) => handleChange(index, 'ceiling_height', val)} min={0} style={{ width: '100%', marginTop: 6 }} placeholder={t('hotelEdit.roomType.placeholderCeiling')} />
              </Col>
              <Col flex="140px">
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.roomType.labelWifi')}</Typography.Text>
                <div style={{ marginTop: 6 }}><Checkbox checked={(room.wifi ?? true) === true} onChange={(e) => handleChange(index, 'wifi', e.target.checked)}>{t('hotelEdit.roomType.wifiProvided')}</Checkbox></div>
              </Col>
              <Col flex="140px">
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.roomType.labelBreakfast')}</Typography.Text>
                <div style={{ marginTop: 6 }}><Checkbox checked={(room.breakfast_included ?? false) === true} onChange={(e) => handleChange(index, 'breakfast_included', e.target.checked)}>{t('hotelEdit.roomType.breakfastIncluded')}</Checkbox></div>
              </Col>
              <Col flex="100%">
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.roomType.labelImages')}</Typography.Text>
                <div style={{ marginTop: 6 }}>
                  <ImageUploader value={room.images || []} onChange={(val) => handleChange(index, 'images', val)} />
                </div>
              </Col>
            </Row>
          </Card>
        )
      })}

      {approvedRequests.length > 0 && (
        <div style={{ padding: '8px 12px', background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.roomType.approvedTitle')}</Typography.Text>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {approvedRequests.map((req, idx) => {
              const exists = safeValue.some((room) => room && room.name === req.name)
              const price = req.data?.price ?? 0
              const stock = req.data?.stock ?? 0
              const capacity = req.data?.capacity
              const bedWidth = req.data?.bed_width
              const area = req.data?.area
              const ceiling = req.data?.ceiling_height
              const wifi = req.data?.wifi
              const breakfast = req.data?.breakfast_included
              const images = Array.isArray(req.data?.images) ? req.data?.images : []
              const detailParts = [
                capacity ? t('hotelEdit.roomType.summary.capacity', { value: capacity }) : null,
                bedWidth ? t('hotelEdit.roomType.summary.bedWidth', { value: bedWidth }) : null,
                area ? t('hotelEdit.roomType.summary.area', { value: area }) : null,
                ceiling ? t('hotelEdit.roomType.summary.ceiling', { value: ceiling }) : null,
                wifi === true ? t('hotelEdit.roomType.summary.wifi') : wifi === false ? t('hotelEdit.roomType.summary.noWifi') : null,
                breakfast === true ? t('hotelEdit.roomType.summary.breakfast') : breakfast === false ? t('hotelEdit.roomType.summary.noBreakfast') : null,
                images.length ? t('hotelEdit.roomType.approvedImageCount', { count: images.length }) : null
              ].filter(Boolean)
              return (
                <div key={`${req.id || req.name}-${idx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ fontSize: 13 }}>
                    <Tag color={exists ? 'default' : 'green'} style={{ marginRight: 8 }}>{req.name}</Tag>
                    <span style={{ color: '#999' }}>{t('hotelEdit.roomType.approvedPriceStock', { price, stock })}{detailParts.length ? ` / ${detailParts.join(' · ')}` : ''}</span>
                  </div>
                    <GlassButton size="small" onClick={() => onReuseApproved?.(req, exists ? 'remove' : 'add')}>
                    {exists ? t('hotelEdit.roomType.approvedRemove') : t('hotelEdit.roomType.approvedAdd')}
                  </GlassButton>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {pendingRequests.length > 0 && (
        <div style={{ padding: '8px 12px', background: '#fffbe6', borderRadius: 8 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.roomType.pendingTitle')}</Typography.Text>
          {pendingRequests.map((req, idx) => (<Tag key={idx} color="orange" style={{ marginLeft: 8 }}>{req.name} {t('hotelEdit.roomType.pendingStatus')}</Tag>))}
        </div>
      )}

      {showPresets && (
        <Card size="small" style={{ background: '#fafafa' }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.roomType.presetTitle')}</Typography.Text>
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {presetRoomTypes.map(preset => (
              <Tag key={preset.name} style={{ cursor: 'pointer', padding: '4px 12px' }} onClick={() => handleAddPreset(preset)}>
                {preset.name} ({t('hotelEdit.roomType.presetPriceLabel', { price: preset.default_price || preset.defaultPrice })})
              </Tag>
            ))}
          </div>
        </Card>
      )}

      {showCustomInput && (
        <Card size="small" style={{ borderRadius: 12, border: '1px solid #b7eb8f', background: '#f6ffed' }} styles={{ body: { padding: 12 } }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.roomType.requestTitle')}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.roomType.requestHint')}</Typography.Text>
          </div>
          <Row gutter={[12, 12]}>
            <Col flex="220px">
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.roomType.labelName')}</Typography.Text>
              <Input placeholder={t('hotelEdit.roomType.placeholderName')} value={customRoom.name} onChange={(e) => setCustomRoom({ ...customRoom, name: e.target.value })} style={{ marginTop: 6 }} />
            </Col>
            <Col flex="160px">
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.roomType.labelPrice')}</Typography.Text>
              <InputNumber placeholder={t('hotelEdit.roomType.placeholderPrice')} value={customRoom.price} onChange={(val) => setCustomRoom({ ...customRoom, price: val })} min={0} style={{ width: '100%', marginTop: 6 }} prefix="¥" />
            </Col>
            <Col flex="140px">
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.roomType.labelStock')}</Typography.Text>
              <InputNumber placeholder={t('hotelEdit.roomType.placeholderStock')} value={customRoom.stock} onChange={(val) => setCustomRoom({ ...customRoom, stock: val })} min={0} style={{ width: '100%', marginTop: 6 }} />
            </Col>
            <Col flex="140px">
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.roomType.labelCapacity')}</Typography.Text>
              <InputNumber placeholder={t('hotelEdit.roomType.placeholderCapacity')} value={customRoom.capacity} onChange={(val) => setCustomRoom({ ...customRoom, capacity: val })} min={0} style={{ width: '100%', marginTop: 6 }} />
            </Col>
            <Col flex="140px">
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.roomType.labelBedWidth')}</Typography.Text>
              <InputNumber placeholder={t('hotelEdit.roomType.placeholderBedWidth')} value={customRoom.bed_width} onChange={(val) => setCustomRoom({ ...customRoom, bed_width: val })} min={0} style={{ width: '100%', marginTop: 6 }} />
            </Col>
            <Col flex="140px">
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.roomType.labelArea')}</Typography.Text>
              <InputNumber placeholder={t('hotelEdit.roomType.placeholderArea')} value={customRoom.area} onChange={(val) => setCustomRoom({ ...customRoom, area: val })} min={0} style={{ width: '100%', marginTop: 6 }} />
            </Col>
            <Col flex="140px">
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.roomType.labelCeiling')}</Typography.Text>
              <InputNumber placeholder={t('hotelEdit.roomType.placeholderCeiling')} value={customRoom.ceiling_height} onChange={(val) => setCustomRoom({ ...customRoom, ceiling_height: val })} min={0} style={{ width: '100%', marginTop: 6 }} />
            </Col>
            <Col flex="140px">
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.roomType.labelWifi')}</Typography.Text>
              <div style={{ marginTop: 6 }}><Checkbox checked={!!customRoom.wifi} onChange={(e) => setCustomRoom({ ...customRoom, wifi: e.target.checked })}>{t('hotelEdit.roomType.wifiProvided')}</Checkbox></div>
            </Col>
            <Col flex="140px">
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.roomType.labelBreakfast')}</Typography.Text>
              <div style={{ marginTop: 6 }}><Checkbox checked={!!customRoom.breakfast_included} onChange={(e) => setCustomRoom({ ...customRoom, breakfast_included: e.target.checked })}>{t('hotelEdit.roomType.breakfastIncluded')}</Checkbox></div>
            </Col>
            <Col flex="100%">
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.roomType.labelImages')}</Typography.Text>
              <div style={{ marginTop: 6 }}>
                <ImageUploader value={customRoom.images || []} onChange={(val) => setCustomRoom({ ...customRoom, images: val })} />
              </div>
            </Col>
            <Col flex="220px" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <Space>
                <GlassButton type="primary" onClick={handleRequestNew}>{t('hotelEdit.roomType.submit')}</GlassButton>
                <GlassButton onClick={() => setShowCustomInput(false)}>{t('hotelEdit.roomType.cancel')}</GlassButton>
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      <Row gutter={8}>
        <Col><GlassButton type="dashed" icon={<PlusOutlined />} onClick={() => setShowPresets(!showPresets)}>{showPresets ? t('hotelEdit.roomType.togglePresetsHide') : t('hotelEdit.roomType.togglePresetsShow')}</GlassButton></Col>
        <Col><GlassButton type="dashed" icon={<PlusOutlined />} onClick={() => setShowCustomInput(!showCustomInput)}>{t('hotelEdit.roomType.requestCustom')}</GlassButton></Col>
      </Row>
    </div>
  )
}

// ========== 优惠管理组件 ==========
function PromotionManager({ value = [], onChange, pendingRequests = [], approvedRequests = [], onRequestNew, onReuseApproved, presetPromotionTypes = [] }) {
  const { t } = useTranslation()
  const [showPresets, setShowPresets] = useState(false)
  const [customPromo, setCustomPromo] = useState({ type: '', title: '', value: 0 })
  const [showCustomInput, setShowCustomInput] = useState(false)

  const getUnitLabel = (promoValue) => {
    const val = Number(promoValue) || 0
    if (val < 0) return t('hotelEdit.promotion.unitAmount')
    if (val > 10) return t('hotelEdit.promotion.unitAmount')
    return t('hotelEdit.promotion.unitDiscount')
  }

  const getValueLabel = (promoValue) => {
    const val = Number(promoValue) || 0
    if (val < 0) return t('hotelEdit.promotion.valueAmount', { value: Math.abs(val) })
    if (val > 10) return t('hotelEdit.promotion.valueAmount', { value: val })
    if (val > 0) return t('hotelEdit.promotion.valueDiscount', { value: val })
    return t('hotelEdit.promotion.valueUnset')
  }

  const handleAddPreset = (preset) => {
    onChange?.([...value, { type: preset.type, title: preset.label, value: 9 }])
    message.success(t('hotelEdit.promotion.presetAdded', { name: preset.label }))
  }

  const handleRemove = (index) => onChange?.(value.filter((_, idx) => idx !== index))

  const handleChange = (index, field, val) => {
    const newValue = [...value]
    newValue[index] = { ...newValue[index], [field]: val }
    onChange?.(newValue)
  }

  const handleRequestNew = () => {
    if (!customPromo.title.trim()) { message.error(t('hotelEdit.promotion.titleRequired')); return }
    onRequestNew?.(customPromo)
    setCustomPromo({ type: '', title: '', value: 0 })
    setShowCustomInput(false)
    message.success(t('hotelEdit.promotion.requestSuccess'))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 14 }}>
      {value.map((promo, index) => (
        <Card
          key={index}
          size="small"
          style={{ borderRadius: 12, border: '1px solid #f0f0f0', background: '#fafafa' }}
          styles={{ body: { padding: 12 } }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Tag color="geekblue" style={{ margin: 0 }}>{t('hotelEdit.promotion.titleLabel', { index: index + 1 })}</Tag>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{getValueLabel(promo.value)}</Typography.Text>
            </div>
            <GlassButton type="link" danger icon={<DeleteOutlined />} onClick={() => handleRemove(index)}>{t('hotelEdit.promotion.delete')}</GlassButton>
          </div>
          <Row gutter={[12, 12]}>
            <Col flex="140px">
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.promotion.typeLabel')}</Typography.Text>
              <Input value={promo.type} onChange={(e) => handleChange(index, 'type', e.target.value)} placeholder={t('hotelEdit.promotion.typePlaceholder')} style={{ marginTop: 6 }} />
            </Col>
            <Col flex="300px">
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.promotion.titleLabelText')}</Typography.Text>
              <Input value={promo.title} onChange={(e) => handleChange(index, 'title', e.target.value)} placeholder={t('hotelEdit.promotion.titlePlaceholder')} style={{ marginTop: 6 }} />
            </Col>
            <Col flex="160px">
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.promotion.valueLabel')}</Typography.Text>
              <Space.Compact style={{ width: '100%', marginTop: 6 }}>
                <InputNumber
                  value={promo.value}
                  onChange={(val) => handleChange(index, 'value', val)}
                  style={{ width: '100%' }}
                  placeholder={t('hotelEdit.promotion.valuePlaceholder')}
                />
                <div style={{ padding: '0 10px', background: '#fafafa', border: '1px solid #d9d9d9', borderLeft: 0, borderRadius: '0 6px 6px 0', display: 'flex', alignItems: 'center', color: '#999' }}>
                  {getUnitLabel(promo.value)}
                </div>
              </Space.Compact>
            </Col>
            <Col flex="340px">
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.promotion.periodLabel')}</Typography.Text>
              <DatePicker.RangePicker
                showTime
                style={{ width: '100%', marginTop: 6 }}
                value={
                  Array.isArray(promo.periods) && promo.periods[0]
                    ? [dayjs(promo.periods[0].start), dayjs(promo.periods[0].end)]
                    : null
                }
                onChange={(dates) => {
                  const periods = dates && dates.length === 2
                    ? [{ start: dates[0].toISOString(), end: dates[1].toISOString() }]
                    : []
                  handleChange(index, 'periods', periods)
                }}
              />
            </Col>
          </Row>
        </Card>
      ))}

      {approvedRequests.length > 0 && (
        <Card size="small" style={{ borderRadius: 12, border: '1px solid #b7eb8f', background: '#f6ffed' }} styles={{ body: { padding: 12 } }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.promotion.approvedTitle')}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.promotion.approvedHint')}</Typography.Text>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {approvedRequests.map((req, idx) => {
              const exists = value.some((promo) => promo && promo.title === req.name && promo.type === (req.data?.type || ''))
              const type = req.data?.type || ''
              const valueText = req.data?.value ?? 0
              return (
                <div key={`${req.id || req.name}-${idx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ fontSize: 13 }}>
                    {type && <Tag color={exists ? 'default' : 'green'} style={{ marginRight: 8 }}>{type}</Tag>}
                    <span>{req.name}</span>
                    <span style={{ color: '#f5222d', marginLeft: 8 }}>
                      {valueText < 0 ? t('hotelEdit.promotion.valueAmount', { value: Math.abs(valueText) }) : (valueText > 10 ? t('hotelEdit.promotion.valueAmount', { value: valueText }) : t('hotelEdit.promotion.valueDiscount', { value: valueText }))}
                    </span>
                  </div>
                  <GlassButton size="small" onClick={() => onReuseApproved?.(req, exists ? 'remove' : 'add')}>
                    {exists ? t('hotelEdit.promotion.approvedRemove') : t('hotelEdit.promotion.approvedAdd')}
                  </GlassButton>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {pendingRequests.length > 0 && (
        <Card size="small" style={{ borderRadius: 12, border: '1px solid #ffe58f', background: '#fffbe6' }} styles={{ body: { padding: 12 } }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.promotion.pendingTitle')}</Typography.Text>
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {pendingRequests.map((req, idx) => (
              <Tag key={idx} color="orange" style={{ margin: 0 }}>{req.title} {t('hotelEdit.promotion.pendingStatus')}</Tag>
            ))}
          </div>
        </Card>
      )}

      {showPresets && (
        <Card size="small" style={{ borderRadius: 12, border: '1px solid #f0f0f0', background: '#fff' }} styles={{ body: { padding: 12 } }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('hotelEdit.promotion.presetTitle')}</Typography.Text>
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {presetPromotionTypes.map(preset => (
              <Tag key={preset.type} color="blue" style={{ cursor: 'pointer', padding: '4px 12px', margin: 0 }} onClick={() => handleAddPreset(preset)}>{preset.label}</Tag>
            ))}
          </div>
        </Card>
      )}

      {showCustomInput && (
        <Card size="small" style={{ borderRadius: 12, border: '1px solid #b7eb8f', background: '#f6ffed' }} styles={{ body: { padding: 12 } }}>
          <Typography.Text style={{ fontSize: 12 }}>{t('hotelEdit.promotion.requestTitle')}</Typography.Text>
          <Row gutter={[12, 12]} style={{ marginTop: 10 }}>
            <Col flex="140px">
              <Input placeholder={t('hotelEdit.promotion.requestTypePlaceholder')} value={customPromo.type} onChange={(e) => setCustomPromo({ ...customPromo, type: e.target.value })} />
            </Col>
            <Col flex="auto">
              <Input placeholder={t('hotelEdit.promotion.requestTitlePlaceholder')} value={customPromo.title} onChange={(e) => setCustomPromo({ ...customPromo, title: e.target.value })} />
            </Col>
            <Col flex="160px">
              <InputNumber
                placeholder={t('hotelEdit.promotion.requestValuePlaceholder')}
                value={customPromo.value}
                onChange={(val) => setCustomPromo({ ...customPromo, value: val })}
                style={{ width: '100%' }}
              />
            </Col>
            <Col flex="200px">
              <Space>
                <GlassButton type="primary" onClick={handleRequestNew}>{t('hotelEdit.promotion.submit')}</GlassButton>
                <GlassButton onClick={() => setShowCustomInput(false)}>{t('hotelEdit.promotion.cancel')}</GlassButton>
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      <Space wrap>
        <GlassButton type="dashed" icon={<PlusOutlined />} onClick={() => setShowPresets(!showPresets)}>{showPresets ? t('hotelEdit.promotion.togglePresetsHide') : t('hotelEdit.promotion.togglePresetsShow')}</GlassButton>
        <GlassButton type="dashed" icon={<PlusOutlined />} onClick={() => setShowCustomInput(!showCustomInput)}>{t('hotelEdit.promotion.requestCustom')}</GlassButton>
      </Space>
    </div>
  )
}

// ========== 周边信息组件 ==========
function NearbyInfoEditor({ attractions = [], transport = [], malls = [], onChangeAttractions, onChangeTransport, onChangeMalls }) {
  const { t } = useTranslation()
  const [searchText, setSearchText] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchType, setSearchType] = useState('all') // all, attraction, transport, mall
  const searchKeywords = {
    attraction: t('hotelEdit.nearby.searchKeywords.attraction'),
    transport: t('hotelEdit.nearby.searchKeywords.transport'),
    mall: t('hotelEdit.nearby.searchKeywords.mall')
  }
  const typeTokens = {
    transport: t('hotelEdit.nearby.typeTokens.transport', { returnObjects: true }),
    mall: t('hotelEdit.nearby.typeTokens.mall', { returnObjects: true })
  }

  const hasAnyToken = (source, tokens) => {
    const tokenList = Array.isArray(tokens) ? tokens : [tokens]
    return tokenList.some((token) => String(source || '').includes(String(token || '').toLowerCase()))
  }

  // 通过高德 API 搜索周边
  const handleSearch = async () => {
    if (!searchText.trim()) return
    
    setSearching(true)
    try {
      // 根据类型设置搜索关键词
      let keywords = searchText
      if (searchType !== 'all' && searchKeywords[searchType]) {
        keywords += ` ${searchKeywords[searchType]}`
      }
      
      const result = await api.get(`/api/map/search?keywords=${encodeURIComponent(keywords)}`)
      
      if (result.success && result.data && result.data.length > 0) {
        const unknownDistance = t('hotelEdit.nearby.unknownDistance')
        const results = result.data.map(poi => {
          // 根据POI类型判断分类
          let type = 'attraction'
          const typeName = (poi.type || '').toLowerCase()
          if (hasAnyToken(typeName, typeTokens.transport)) {
            type = 'transport'
          } else if (hasAnyToken(typeName, typeTokens.mall)) {
            type = 'mall'
          }
          
          return {
            name: poi.name,
            address: poi.address || '',
            distance: (poi.distance && !isNaN(parseFloat(poi.distance)))
              ? t('hotelEdit.nearby.distanceMeter', { value: poi.distance })
              : unknownDistance,
            type: type
          }
        })
        setSearchResults(results)
      } else {
        message.warning(result.message || t('hotelEdit.nearby.noResult'))
        setSearchResults([])
      }
    } catch (err) {
      console.error(err)
      message.error(t('hotelEdit.nearby.searchError'))
    } finally {
      setSearching(false)
    }
  }

  const handleAdd = (item) => {
    const unknownDistance = t('hotelEdit.nearby.unknownDistance')
    const info = item.distance !== unknownDistance ? `${item.name}(${item.distance})` : item.name
    if (item.type === 'attraction' && !attractions.includes(info)) { onChangeAttractions?.([...attractions, info]); message.success(t('hotelEdit.nearby.addAttractionSuccess')) }
    else if (item.type === 'transport' && !transport.includes(info)) { onChangeTransport?.([...transport, info]); message.success(t('hotelEdit.nearby.addTransportSuccess')) }
    else if (item.type === 'mall' && !malls.includes(info)) { onChangeMalls?.([...malls, info]); message.success(t('hotelEdit.nearby.addMallSuccess')) }
  }

  const typeOptions = [
    { value: 'all', label: t('hotelEdit.nearby.typeAll') },
    { value: 'attraction', label: t('hotelEdit.nearby.typeAttraction') },
    { value: 'transport', label: t('hotelEdit.nearby.typeTransport') },
    { value: 'mall', label: t('hotelEdit.nearby.typeMall') }
  ]

  const getTypeTag = (type) => {
    if (type === 'attraction') return <Tag color="green">{t('hotelEdit.nearby.tagAttraction')}</Tag>
    if (type === 'transport') return <Tag color="blue">{t('hotelEdit.nearby.tagTransport')}</Tag>
    if (type === 'mall') return <Tag color="orange">{t('hotelEdit.nearby.tagMall')}</Tag>
    return <Tag>{t('hotelEdit.nearby.tagOther')}</Tag>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 16 }}>
      <Card size="small" title={t('hotelEdit.nearby.searchTitle')}>
        <Row gutter={8}>
          <Col flex="auto">
            <Input 
              placeholder={t('hotelEdit.nearby.searchPlaceholder')} 
              value={searchText} 
              onChange={(e) => setSearchText(e.target.value)} 
              onPressEnter={handleSearch} 
              prefix={<SearchOutlined />} 
            />
          </Col>
          <Col>
            <Select 
              value={searchType} 
              onChange={setSearchType} 
              options={typeOptions}
              style={{ width: 90 }}
            />
          </Col>
          <Col>
            <Tooltip title={t('hotelEdit.tips.tooltip.nearbySearch')}>
              <GlassButton onClick={handleSearch} loading={searching}>{t('hotelEdit.nearby.searchButton')}</GlassButton>
            </Tooltip>
          </Col>
        </Row>
        {searchResults.length > 0 && (
          <div style={{ marginTop: 12, maxHeight: 250, overflow: 'auto' }}>
            {searchResults.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ flex: 1 }}>
                  <span>{item.name}</span>
                  {getTypeTag(item.type)}
                  {item.distance !== t('hotelEdit.nearby.unknownDistance') && <Tag style={{ marginLeft: 4 }}>{item.distance}</Tag>}
                  {item.address && <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{item.address}</div>}
                </div>
                <Tooltip title={t('hotelEdit.tips.tooltip.nearbyAdd')}>
                  <GlassButton type="link" size="small" onClick={() => handleAdd(item)}>{t('hotelEdit.nearby.addButton')}</GlassButton>
                </Tooltip>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Row gutter={16}>
        <Col span={8}>
          <Card size="small" title={t('hotelEdit.nearby.cardAttractions')}>
            <Select mode="tags" style={{ width: '100%' }} value={attractions} onChange={onChangeAttractions} placeholder={t('hotelEdit.nearby.tagsPlaceholder')} tokenSeparators={[',']} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" title={t('hotelEdit.nearby.cardTransport')}>
            <Select mode="tags" style={{ width: '100%' }} value={transport} onChange={onChangeTransport} placeholder={t('hotelEdit.nearby.tagsPlaceholder')} tokenSeparators={[',']} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" title={t('hotelEdit.nearby.cardMalls')}>
            <Select mode="tags" style={{ width: '100%' }} value={malls} onChange={onChangeMalls} placeholder={t('hotelEdit.nearby.tagsPlaceholder')} tokenSeparators={[',']} />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

// ========== 预览组件 ==========
function HotelPreview({ data }) {
  const { t } = useTranslation()
  if (!data) return null

  const roomColumns = [
    { title: t('hotelEdit.preview.roomName'), dataIndex: 'name', key: 'name' },
    { 
      title: t('hotelEdit.preview.roomPrice'), 
      key: 'price', 
      render: (_, record) => {
        const price = Number(record.price) || 0
        const discount = Number(record.discount_rate) || 0
        let finalPrice = price
        let discountText = ''
        const now = dayjs()
        const promos = (data.promotions || []).filter(p => p && p.title)
        const effectivePromos = promos.filter(p => {
          const periods = Array.isArray(p.periods) ? p.periods : []
          if (!periods.length) return true
          return periods.some(r => {
            const s = dayjs(r.start)
            const e = dayjs(r.end)
            return now.isAfter(s) && now.isBefore(e)
          })
        })
        effectivePromos.forEach(p => {
          const val = Number(p.value) || 0
          if (val > 0 && val <= 10) {
            finalPrice = finalPrice * (val / 10)
          } else if (val < 0) {
            finalPrice = Math.max(0, finalPrice + val)
          }
        })
        if (discount > 0 && discount <= 10) {
          finalPrice = finalPrice * (discount / 10)
          discountText = t('hotelEdit.preview.discountRate', { value: discount })
        } else if (discount < 0) {
          finalPrice = Math.max(0, finalPrice + discount)
          discountText = t('hotelEdit.preview.discountAmount', { value: Math.abs(discount) })
        }
        
        finalPrice = Math.round(finalPrice * 100) / 100

        return (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#f5222d', fontWeight: 600 }}>¥{finalPrice}</span>
            {discount !== 0 && (
              <span style={{ fontSize: 12, color: '#999' }}>
                <span style={{ textDecoration: 'line-through', marginRight: 4 }}>¥{price}</span>
                <Tag color="red" style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 2px' }}>{discountText}</Tag>
              </span>
            )}
          </div>
        )
      } 
    },
    { title: t('hotelEdit.preview.roomStock'), dataIndex: 'stock', key: 'stock', render: (v) => v || 0 }
  ]

  const getPromoValueLabel = (promoValue) => {
    const val = Number(promoValue) || 0
    if (val < 0) return t('hotelEdit.preview.promotionValueAmount', { value: Math.abs(val) })
    if (val > 10) return t('hotelEdit.preview.promotionValueAmount', { value: val })
    if (val > 0) return t('hotelEdit.preview.promotionValueDiscount', { value: val })
    return ''
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 16 }}>
      <Card styles={{ body: { padding: 0 } }} style={{ overflow: 'hidden' }}>
        {data.images && data.images.length > 0 ? (
          <div style={{ position: 'relative' }}>
            <Image src={data.images[0]} alt={data.name} width="100%" height={200} style={{ objectFit: 'cover' }} fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88P/BfwYACP4D/pHOlKYAAAAASUVORK5CYII=" />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', padding: '30px 16px 16px', color: '#fff' }}>
              <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>{data.name || t('hotelEdit.preview.fallbackHotelName')}</Typography.Title>
              {data.name_en && <Typography.Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>{data.name_en}</Typography.Text>}
            </div>
            {data.images.length > 1 && <div style={{ position: 'absolute', bottom: 60, right: 16, background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{t('hotelEdit.preview.imageCount', { count: data.images.length })}</div>}
          </div>
        ) : (
          <div style={{ height: 120, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography.Text type="secondary">{t('hotelEdit.preview.emptyImages')}</Typography.Text>
          </div>
        )}
      </Card>

      <Card size="small" title={t('hotelEdit.preview.baseInfo')}>
        <Descriptions column={2} size="small">
          <Descriptions.Item label={<><EnvironmentOutlined /> {t('hotelEdit.preview.city')}</>}>{data.city || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('hotelEdit.preview.address')}>{data.address || '-'}</Descriptions.Item>
          <Descriptions.Item label={<><StarFilled style={{ color: '#faad14' }} /> {t('hotelEdit.preview.star')}</>}>{data.star_rating ? t('hotelEdit.preview.starValue', { value: data.star_rating }) : t('hotelEdit.preview.unrated')}</Descriptions.Item>
          <Descriptions.Item label={<><CalendarOutlined /> {t('hotelEdit.preview.openingTime')}</>}>{data.opening_time ? (typeof data.opening_time === 'object' ? data.opening_time.format?.('YYYY-MM-DD') : data.opening_time) : t('hotelEdit.preview.openingNotSet')}</Descriptions.Item>
        </Descriptions>
        {data.description && <Typography.Paragraph style={{ marginTop: 12, marginBottom: 0 }} ellipsis={{ rows: 2 }}>{data.description}</Typography.Paragraph>}
      </Card>

      {data.facilities && data.facilities.length > 0 && (
        <Card size="small" title={t('hotelEdit.preview.facilities')}>
          <Space wrap size={[4, 4]}>{data.facilities.map((item, index) => (<Tag key={index} color="blue">{item}</Tag>))}</Space>
        </Card>
      )}

      <Card size="small" title={t('hotelEdit.preview.rooms')}>
        <Table columns={roomColumns} dataSource={(data.roomTypes || []).filter(r => r && r.name)} rowKey={(_, index) => index} pagination={false} size="small" locale={{ emptyText: t('hotelEdit.preview.roomsEmpty') }} />
      </Card>

      {data.promotions && data.promotions.filter(p => p && p.title).length > 0 && (
        <Card size="small" title={t('hotelEdit.preview.promotions')}>
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 4 }}>
            {data.promotions.filter(p => p && p.title).map((promo, index) => (
              <div key={index} style={{ padding: '6px 10px', background: '#fff7e6', borderRadius: 4, fontSize: 13 }}>
                {promo.type && <Tag color="orange" style={{ marginRight: 8 }}>{promo.type}</Tag>}
                <span>{promo.title}</span>
                {promo.value && <span style={{ color: '#f5222d', marginLeft: 8 }}>{getPromoValueLabel(promo.value)}</span>}
                {Array.isArray(promo.periods) && promo.periods[0] && (
                  <span style={{ marginLeft: 8, color: '#999' }}>
                    {dayjs(promo.periods[0].start).format('YYYY-MM-DD HH:mm')} ~ {dayjs(promo.periods[0].end).format('YYYY-MM-DD HH:mm')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// ========== 主组件 ==========
export default function HotelEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('edit')
  const [previewData, setPreviewData] = useState({})
  const [pendingFacilities, setPendingFacilities] = useState([])
  const [pendingRoomTypes, setPendingRoomTypes] = useState([])
  const [pendingPromotions, setPendingPromotions] = useState([])
  const [approvedFacilities, setApprovedFacilities] = useState([])
  const [approvedRoomTypes, setApprovedRoomTypes] = useState([])
  const [approvedPromotions, setApprovedPromotions] = useState([])
  const [tourOpen, setTourOpen] = useState(false)
  const headerRef = useRef(null)
  const tabRef = useRef(null)
  const addressSectionRef = useRef(null)
  const roomTypeSectionRef = useRef(null)
  const actionBarRef = useRef(null)

  // 预设数据 state
  const [presets, setPresets] = useState({
    facilities: [],
    roomTypes: [],
    promotionTypes: [],
    cities: []
  })

  const watchedValues = Form.useWatch([], form)

  const isEditing = !!id
  const openTour = () => {
    if (activeTab !== 'edit') setActiveTab('edit')
    setTourOpen(true)
  }

  const tourSteps = useMemo(() => ([
    {
      title: t('hotelEdit.tips.tour.title'),
      description: t('hotelEdit.tips.tour.description')
    },
    {
      title: t('hotelEdit.tips.tour.steps.header.title'),
      description: t('hotelEdit.tips.tour.steps.header.description'),
      target: () => headerRef.current
    },
    {
      title: t('hotelEdit.tips.tour.steps.tabs.title'),
      description: t('hotelEdit.tips.tour.steps.tabs.description'),
      target: () => tabRef.current
    },
    {
      title: t('hotelEdit.tips.tour.steps.address.title'),
      description: t('hotelEdit.tips.tour.steps.address.description'),
      target: () => addressSectionRef.current
    },
    {
      title: t('hotelEdit.tips.tour.steps.roomTypes.title'),
      description: t('hotelEdit.tips.tour.steps.roomTypes.description'),
      target: () => roomTypeSectionRef.current
    },
    {
      title: t('hotelEdit.tips.tour.steps.save.title'),
      description: t('hotelEdit.tips.tour.steps.save.description'),
      target: () => actionBarRef.current
    }
  ]), [t])

  // 加载预设数据
  useEffect(() => {
    const fetchPresets = async () => {
      try {
        const result = await api.get('/api/presets')
        if (result.success && result.data) {
          setPresets({
            facilities: result.data.facilities || [],
            roomTypes: result.data.roomTypes || [],
            promotionTypes: result.data.promotionTypes || [],
            cities: result.data.cities || []
          })
        }
      } catch (err) {
        console.error(err)
        message.error(t('hotelEdit.form.fetchPresetsError'))
      }
    }
    fetchPresets()
  }, [t])

  useEffect(() => {
    const fetchApprovedRequests = async () => {
      try {
        const [facilities, roomTypes, promotions] = await Promise.all([
          api.get('/api/requests?status=approved&type=facility'),
          api.get('/api/requests?status=approved&type=room_type'),
          api.get('/api/requests?status=approved&type=promotion')
        ])
        setApprovedFacilities(Array.isArray(facilities) ? facilities : [])
        setApprovedRoomTypes(Array.isArray(roomTypes) ? roomTypes : [])
        setApprovedPromotions(Array.isArray(promotions) ? promotions : [])
      } catch (error) {
        console.error(error)
        message.error(t('hotelEdit.form.fetchApprovedError'))
      }
    }
    fetchApprovedRequests()
  }, [t])

  useEffect(() => {
    if (id) {
      const fetchHotel = async () => {
        setLoading(true)
        try {
          const data = await api.get(`/api/merchant/hotels/${id}`)
          console.log('[HotelEdit][FetchHotel]', { id, roomTypes: data?.roomTypes, promotions: data?.promotions })
          form.setFieldsValue({
            ...data,
            opening_time: data.opening_time ? dayjs(data.opening_time) : null,
            roomTypes: (data.roomTypes || []).map((rt) => ({
              ...rt,
              capacity: rt.capacity ?? 2,
              bed_width: rt.bed_width ?? 180,
              area: rt.area ?? 20,
              ceiling_height: rt.ceiling_height ?? 2.8,
              wifi: rt.wifi ?? true,
              breakfast_included: rt.breakfast_included ?? false
            })),
            facilities: data.facilities || [],
            images: data.images || [],
            nearby_attractions: data.nearby_attractions || [],
            nearby_transport: data.nearby_transport || [],
            nearby_malls: data.nearby_malls || [],
            promotions: data.promotions || []
          })
          setPreviewData(data)
        } catch (error) { 
          console.error(error)
          message.error(t('hotelEdit.form.fetchHotelError'))
          navigate('/hotels')
        }
        finally { setLoading(false) }
      }
      fetchHotel()
    }
  }, [id, navigate, form, t])

  useEffect(() => {
    if (watchedValues) setPreviewData(watchedValues)
  }, [watchedValues])

  const handleFormChange = () => setPreviewData(form.getFieldsValue())
  
  // 提交设施申请到后端
  const handleRequestFacility = async (name) => {
    try {
      await api.post('/api/requests', {
        hotelId: id ? parseInt(id) : null,
        type: 'facility',
        name: name,
        data: { description: '' }
      })
      setPendingFacilities([...pendingFacilities, { name, status: 'pending' }])
      message.success(t('hotelEdit.request.facilitySuccess'))
    } catch (error) {
      console.error(error)
      message.error(t('hotelEdit.request.submitError'))
    }
  }
  
  // 提交房型申请到后端
  const handleRequestRoomType = async (room) => {
    try {
      await api.post('/api/requests', {
        hotelId: id ? parseInt(id) : null,
        type: 'room_type',
        name: room.name,
        data: {
          price: room.price,
          stock: room.stock,
          capacity: room.capacity,
          bed_width: room.bed_width,
          area: room.area,
          ceiling_height: room.ceiling_height,
          wifi: room.wifi,
          breakfast_included: room.breakfast_included,
          images: Array.isArray(room.images) ? room.images : []
        }
      })
      setPendingRoomTypes([...pendingRoomTypes, { ...room, status: 'pending' }])
      message.success(t('hotelEdit.request.roomTypeSuccess'))
    } catch (error) {
      console.error(error)
      message.error(t('hotelEdit.request.submitError'))
    }
  }
  
  // 提交优惠申请到后端
  const handleRequestPromotion = async (promo) => {
    try {
      await api.post('/api/requests', {
        hotelId: id ? parseInt(id) : null,
        type: 'promotion',
        name: promo.title,
        data: { type: promo.type, value: promo.value }
      })
      setPendingPromotions([...pendingPromotions, { ...promo, status: 'pending' }])
      message.success(t('hotelEdit.request.promotionSuccess'))
    } catch (error) {
      console.error(error)
      message.error(t('hotelEdit.request.submitError'))
    }
  }

  const handleReuseFacility = (req, action) => {
    const current = form.getFieldValue('facilities') || []
    if (action === 'remove') {
      if (current.includes(req.name)) {
        form.setFieldsValue({ facilities: current.filter((item) => item !== req.name) })
        handleFormChange()
      }
      return
    }
    if (!current.includes(req.name)) {
      form.setFieldsValue({ facilities: [...current, req.name] })
      handleFormChange()
    }
  }

  const handleReuseRoomType = (req, action) => {
    const current = form.getFieldValue('roomTypes') || []
    const exists = current.some((room) => room && room.name === req.name)
    if (action === 'remove') {
      if (exists) {
        form.setFieldsValue({
          roomTypes: current.filter((room) => room && room.name !== req.name)
        })
        handleFormChange()
      }
      return
    }
    if (!exists) {
      form.setFieldsValue({
        roomTypes: [...current, {
          name: req.name,
          price: req.data?.price || 0,
          stock: req.data?.stock || 0,
          capacity: req.data?.capacity,
          bed_width: req.data?.bed_width,
          area: req.data?.area,
          ceiling_height: req.data?.ceiling_height,
          wifi: req.data?.wifi,
            breakfast_included: req.data?.breakfast_included,
            images: Array.isArray(req.data?.images) ? req.data?.images : []
        }]
      })
      handleFormChange()
    }
  }

  const handleReusePromotion = (req, action) => {
    const current = form.getFieldValue('promotions') || []
    const type = req.data?.type || ''
    const exists = current.some((promo) => promo && promo.title === req.name && promo.type === type)
    if (action === 'remove') {
      if (exists) {
        form.setFieldsValue({
          promotions: current.filter((promo) => !(promo && promo.title === req.name && promo.type === type))
        })
        handleFormChange()
      }
      return
    }
    if (!exists) {
      form.setFieldsValue({
        promotions: [...current, { type, title: req.name, value: req.data?.value || 0 }]
      })
      handleFormChange()
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const nearbyAttractions = form.getFieldValue('nearby_attractions') || []
      const nearbyTransport = form.getFieldValue('nearby_transport') || []
      const nearbyMalls = form.getFieldValue('nearby_malls') || []
      const roomTypesValue = form.getFieldValue('roomTypes')
      const promotionsValue = form.getFieldValue('promotions')
      console.log('[HotelEdit][BeforeSubmit]', { values, roomTypesValue, promotionsValue })
      const payload = {
        ...values,
        star_rating: Number(values.star_rating || 0),
        opening_time: values.opening_time ? values.opening_time.format('YYYY-MM-DD') : '',
        nearby_attractions: Array.isArray(nearbyAttractions) ? nearbyAttractions : [],
        nearby_transport: Array.isArray(nearbyTransport) ? nearbyTransport : [],
        nearby_malls: Array.isArray(nearbyMalls) ? nearbyMalls : [],
        roomTypes: (roomTypesValue || values.roomTypes || []).filter((room) => room && room.name),
        promotions: (promotionsValue || values.promotions || []).filter((promo) => promo && promo.title)
      }
      console.log('[HotelEdit][SubmitPayload]', payload)
      setSaving(true)
      if (isEditing) {
        await api.put(`/api/merchant/hotels/${id}`, payload)
      } else {
        await api.post('/api/merchant/hotels', payload)
      }
      message.success(t('hotelEdit.form.saveSuccess'))
      navigate('/hotels')
    } catch (err) {
      if (err.errorFields) message.error(t('hotelEdit.form.validationError'))
      else message.error(t('hotelEdit.form.saveError'))
    } finally { setSaving(false) }
  }

  const tabItems = [
    {
      key: 'edit',
      label: <span><EditOutlined /> {t('hotelEdit.form.tabEdit')}</span>,
      children: (
        <Spin spinning={loading}>
          <Form layout="vertical" form={form} initialValues={{ star_rating: 0 }} onValuesChange={handleFormChange}>
          <div ref={addressSectionRef}>
            <Typography.Title level={5}>{t('hotelEdit.form.sectionAddress')}</Typography.Title>
            <MapPicker onAddressChange={({ city, address }) => { form.setFieldsValue({ city, address }); handleFormChange() }} hotCities={presets.cities} />
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="city" label={t('hotelEdit.form.cityLabel')} rules={[{ required: true, message: t('hotelEdit.form.cityRequired') }]}>
                  <Select showSearch placeholder={t('hotelEdit.form.cityPlaceholder')} options={presets.cities.map(c => ({ value: c.name || c, label: c.name || c }))} filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())} allowClear onChange={handleFormChange} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="address" label={t('hotelEdit.form.addressLabel')} rules={[{ required: true, message: t('hotelEdit.form.addressRequired') }]}>
                  <Input placeholder={t('hotelEdit.form.addressPlaceholder')} />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <Divider />
          <Typography.Title level={5}>{t('hotelEdit.form.sectionBasic')}</Typography.Title>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="name" label={t('hotelEdit.form.nameLabel')} rules={[{ required: true, message: t('hotelEdit.form.nameRequired') }]}><Input placeholder={t('hotelEdit.form.namePlaceholder')} /></Form.Item></Col>
            <Col span={12}><Form.Item name="name_en" label={t('hotelEdit.form.nameEnLabel')}><Input placeholder={t('hotelEdit.form.nameEnPlaceholder')} /></Form.Item></Col>
            <Col span={12}>
              <Form.Item name="star_rating" label={t('hotelEdit.form.starLabel')}>
                <Select options={[
                  { value: 0, label: t('hotelEdit.form.starUnrated') },
                  { value: 1, label: t('hotelEdit.form.star1') },
                  { value: 2, label: t('hotelEdit.form.star2') },
                  { value: 3, label: t('hotelEdit.form.star3') },
                  { value: 4, label: t('hotelEdit.form.star4') },
                  { value: 5, label: t('hotelEdit.form.star5') }
                ]} />
              </Form.Item>
            </Col>
            <Col span={12}><Form.Item name="opening_time" label={t('hotelEdit.form.openingTimeLabel')}><DatePicker style={{ width: '100%' }} placeholder={t('hotelEdit.form.openingTimePlaceholder')} /></Form.Item></Col>
            <Col span={24}><Form.Item name="description" label={t('hotelEdit.form.descriptionLabel')}><Input.TextArea rows={3} placeholder={t('hotelEdit.form.descriptionPlaceholder')} /></Form.Item></Col>
          </Row>

          <Divider />
          <Typography.Title level={5}>{t('hotelEdit.form.sectionImages')}</Typography.Title>
          <Form.Item name="images"><ImageUploader /></Form.Item>

          <Divider />
          <Typography.Title level={5}>{t('hotelEdit.form.sectionFacilities')}</Typography.Title>
          <Form.Item name="facilities">
            <FacilitySelector
              pendingRequests={pendingFacilities}
              approvedRequests={approvedFacilities}
              onRequestNew={handleRequestFacility}
              onReuseApproved={handleReuseFacility}
              presetFacilities={presets.facilities}
            />
          </Form.Item>

          <Divider />
          <Typography.Title level={5}>{t('hotelEdit.form.sectionNearby')}</Typography.Title>
          <Form.Item name="nearby_attractions" hidden><Input /></Form.Item>
          <Form.Item name="nearby_transport" hidden><Input /></Form.Item>
          <Form.Item name="nearby_malls" hidden><Input /></Form.Item>
          <NearbyInfoEditor
            attractions={form.getFieldValue('nearby_attractions') || []}
            transport={form.getFieldValue('nearby_transport') || []}
            malls={form.getFieldValue('nearby_malls') || []}
            onChangeAttractions={(val) => { form.setFieldsValue({ nearby_attractions: val }); handleFormChange() }}
            onChangeTransport={(val) => { form.setFieldsValue({ nearby_transport: val }); handleFormChange() }}
            onChangeMalls={(val) => { form.setFieldsValue({ nearby_malls: val }); handleFormChange() }}
          />

          <Divider />
          <div ref={roomTypeSectionRef}>
            <Typography.Title level={5}>{t('hotelEdit.form.sectionRoomTypes')}</Typography.Title>
            <Form.Item
              name="roomTypes"
              valuePropName="value"
              getValueFromEvent={(v) => v}
            >
              <RoomTypeManager
                pendingRequests={pendingRoomTypes}
                approvedRequests={approvedRoomTypes}
                onRequestNew={handleRequestRoomType}
                onReuseApproved={handleReuseRoomType}
                presetRoomTypes={presets.roomTypes}
              />
            </Form.Item>
          </div>

          <Divider />
          <Typography.Title level={5}>{t('hotelEdit.form.sectionPromotions')}</Typography.Title>
          <Form.Item
            name="promotions"
            valuePropName="value"
            getValueFromEvent={(v) => v}
          >
            <PromotionManager
              pendingRequests={pendingPromotions}
              approvedRequests={approvedPromotions}
              onRequestNew={handleRequestPromotion}
              onReuseApproved={handleReusePromotion}
              presetPromotionTypes={presets.promotionTypes}
            />
          </Form.Item>
        </Form>
        </Spin>
      )
    },
    { key: 'preview', label: <span><EyeOutlined /> {t('hotelEdit.form.tabPreview')}</span>, children: <Spin spinning={loading}><HotelPreview data={previewData} /></Spin> }
  ]

  return (
    <>
      <div ref={headerRef} style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>{isEditing ? t('hotelEdit.form.titleEdit') : t('hotelEdit.form.titleNew')}</Typography.Title>
        <div ref={actionBarRef}>
          <Space>
            <Tooltip title={t('hotelEdit.tips.tooltip.cancel')}>
              <GlassButton onClick={() => navigate('/hotels')}>{t('hotelEdit.form.cancel')}</GlassButton>
            </Tooltip>
            <Tooltip title={t('hotelEdit.tips.tooltip.submit')}>
              <GlassButton type="primary" loading={saving} onClick={handleSubmit}>{isEditing ? t('hotelEdit.form.submitEdit') : t('hotelEdit.form.submitNew')}</GlassButton>
            </Tooltip>
          </Space>
        </div>
      </div>
      <div ref={tabRef}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} destroyOnHidden={false} />
      </div>

      <Affix offsetBottom={24} style={{ position: 'fixed', right: 32, bottom: 24, zIndex: 1100 }}>
        <Tooltip title={t('hotelEdit.tips.tooltip.tourTrigger')} placement="left">
          <GlassButton
            onClick={openTour}
            icon={<QuestionCircleOutlined />}
            aria-label={t('hotelEdit.tips.tooltip.tourTrigger')}
            style={{
              width: 48,
              height: 48,
              padding: 0,
              borderRadius: '50%',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)'
            }}
          />
        </Tooltip>
      </Affix>

      <Tour
        open={tourOpen}
        onClose={() => setTourOpen(false)}
        steps={tourSteps}
      />
    </>
  )
}
