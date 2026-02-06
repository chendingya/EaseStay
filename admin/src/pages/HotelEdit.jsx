import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Form, Input, InputNumber, Select, Radio, Space, Typography, Divider, DatePicker,
  Row, Col, Spin, Image, Tag, Table, Descriptions, Tabs, Upload, Modal, Badge, Card, Popover
} from 'antd'
import {
  EyeOutlined, EditOutlined, StarFilled, EnvironmentOutlined, CalendarOutlined,
  PlusOutlined, DeleteOutlined, SearchOutlined, PercentageOutlined
} from '@ant-design/icons'
import { GlassButton, glassMessage as message } from '../components'
import { api } from '../services/request'
import dayjs from 'dayjs'

// ========== 地图选择组件 ==========
function MapPicker({ onAddressChange }) {
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
        message.warning(result.message || '未找到相关地点')
        setSearchResults([])
      }
    } catch (err) {
      console.error('搜索失败:', err)
      message.error('搜索失败，请重试')
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
              placeholder="搜索城市或地址..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col><GlassButton onClick={handleSearch} loading={searching}>搜索</GlassButton></Col>
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
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewImage, setPreviewImage] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)

  const fileList = value.map((url, idx) => ({ uid: `-${idx}`, name: `图片${idx + 1}`, status: 'done', url }))

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
      message.success('图片上传成功')
    }, 1000)
  }

  const handleAddUrl = () => {
    if (!urlInput.trim()) return
    if (!urlInput.startsWith('http')) {
      message.error('请输入有效的图片链接')
      return
    }
    onChange?.([...value, urlInput.trim()])
    setUrlInput('')
    setShowUrlInput(false)
    message.success('图片添加成功')
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
            <div><PlusOutlined /><div style={{ marginTop: 8 }}>上传图片</div></div>
          )}
        </Upload>

        {showUrlInput ? (
          <Row gutter={8}>
            <Col flex="auto">
              <Input placeholder="输入图片链接..." value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onPressEnter={handleAddUrl} />
            </Col>
            <Col><GlassButton onClick={handleAddUrl}>添加</GlassButton></Col>
            <Col><GlassButton onClick={() => setShowUrlInput(false)}>取消</GlassButton></Col>
          </Row>
        ) : (
          <GlassButton type="dashed" icon={<PlusOutlined />} onClick={() => setShowUrlInput(true)} block>
            添加图片链接
          </GlassButton>
        )}
      </div>
      <Modal open={previewOpen} footer={null} onCancel={() => setPreviewOpen(false)}>
        <img alt="preview" style={{ width: '100%' }} src={previewImage} />
      </Modal>
    </>
  )
}

// ========== 设施标签选择器 ==========
function FacilitySelector({ value = [], onChange, pendingRequests = [], approvedRequests = [], onRequestNew, onReuseApproved, presetFacilities = [] }) {
  const [customFacility, setCustomFacility] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  const facilityNames = presetFacilities.map(f => f.name || f)

  const handleToggle = (facility) => {
    onChange?.(value.includes(facility) ? value.filter(f => f !== facility) : [...value, facility])
  }

  const handleRequestNew = () => {
    if (!customFacility.trim()) { message.error('请输入设施名称'); return }
    if (facilityNames.includes(customFacility) || value.includes(customFacility)) { message.warning('该设施已存在'); return }
    onRequestNew?.(customFacility)
    setCustomFacility('')
    setShowCustomInput(false)
    message.success('已提交申请，等待管理员审核')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 12 }}>
      <div>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>预设设施（点击选择）：</Typography.Text>
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {facilityNames.map(facility => (
            <Tag key={facility} color={value.includes(facility) ? 'blue' : 'default'} style={{ cursor: 'pointer', padding: '4px 12px' }} onClick={() => handleToggle(facility)}>
              {value.includes(facility) && '✓ '}{facility}
            </Tag>
          ))}
        </div>
      </div>

      {approvedRequests.length > 0 && (
        <div style={{ padding: '8px 12px', background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>已通过申请（点击添加/撤销）：</Typography.Text>
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
                  {req.name}{exists ? '（点击撤销）' : ''}
                </Tag>
              )
            })}
          </div>
        </div>
      )}

      {pendingRequests.length > 0 && (
        <div style={{ padding: '8px 12px', background: '#fffbe6', borderRadius: 8, border: '1px solid #ffe58f' }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>待审核设施：</Typography.Text>
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {pendingRequests.map((req, idx) => (
              <Tag key={idx} color="orange" style={{ margin: 0 }}>
                {req.name} - 审核中
              </Tag>
            ))}
          </div>
        </div>
      )}

      {showCustomInput ? (
        <Row gutter={8}>
          <Col flex="auto"><Input placeholder="输入新设施名称..." value={customFacility} onChange={(e) => setCustomFacility(e.target.value)} onPressEnter={handleRequestNew} /></Col>
          <Col><GlassButton type="primary" onClick={handleRequestNew}>提交申请</GlassButton></Col>
          <Col><GlassButton onClick={() => setShowCustomInput(false)}>取消</GlassButton></Col>
        </Row>
      ) : (
        <GlassButton type="dashed" icon={<PlusOutlined />} onClick={() => setShowCustomInput(true)}>申请新增设施</GlassButton>
      )}
    </div>
  )
}

// ========== 房型管理组件 ==========
function RoomTypeManager({ value = [], onChange, pendingRequests = [], approvedRequests = [], onRequestNew, onReuseApproved, presetRoomTypes = [] }) {
  const [showPresets, setShowPresets] = useState(false)
  const [customRoom, setCustomRoom] = useState({ name: '', price: 0, stock: 10 })
  const [showCustomInput, setShowCustomInput] = useState(false)

  const handleAddPreset = (preset) => {
    onChange?.([...value, { name: preset.name, price: preset.default_price || preset.defaultPrice, stock: 10 }])
    message.success(`已添加${preset.name}`)
  }

  const handleRemove = (index) => onChange?.(value.filter((_, idx) => idx !== index))

  const handleChange = (index, field, val) => {
    const newValue = [...value]
    const currentRoom = newValue[index]
    const updates = { [field]: val }
    
    // 自动设置/清除配额
    if (field === 'discount_rate') {
      if (val && val !== 0) {
        // 如果设置了折扣且当前没有配额，自动填充满库存
        if (!currentRoom.discount_quota) {
          updates.discount_quota = currentRoom.stock || 999
        }
      } else {
        // 如果清除了折扣，清除配额
        updates.discount_quota = 0
      }
    }

    newValue[index] = { ...currentRoom, ...updates }
    onChange?.(newValue)
  }

  const handleRequestNew = () => {
    if (!customRoom.name.trim()) { message.error('请输入房型名称'); return }
    onRequestNew?.(customRoom)
    setCustomRoom({ name: '', price: 0, stock: 10 })
    setShowCustomInput(false)
    message.success('已提交申请，等待管理员审核')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 12 }}>
      {value.map((room, index) => (
        <Row gutter={16} key={index} align="middle">
          <Col span={7}><Input value={room.name} onChange={(e) => handleChange(index, 'name', e.target.value)} placeholder="房型名称" /></Col>
          <Col span={5}><InputNumber value={room.price} onChange={(val) => handleChange(index, 'price', val)} min={0} style={{ width: '100%' }} prefix="¥" /></Col>
          <Col span={4}><InputNumber value={room.stock} onChange={(val) => handleChange(index, 'stock', val)} min={0} style={{ width: '100%' }} /></Col>
          <Col span={4}>
            <Popover
              content={
                <div style={{ padding: 8, width: 280 }}>
                  <Typography.Text strong style={{ display: 'block', marginBottom: 12 }}>单房型优惠设置</Typography.Text>
                  
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ marginBottom: 8 }}>优惠方式:</div>
                    <Radio.Group 
                      value={room._discountType || (room.discount_rate < 0 ? 'amount' : 'rate')} 
                      onChange={(e) => {
                        const newType = e.target.value
                        // 更新UI类型状态
                        handleChange(index, '_discountType', newType)
                        // 更新数值符号
                        const currentVal = Math.abs(room.discount_rate || 0)
                        const newVal = newType === 'amount' ? -currentVal : currentVal
                        handleChange(index, 'discount_rate', newVal)
                      }}
                      style={{ marginBottom: 12, display: 'flex' }}
                      optionType="button"
                      buttonStyle="solid"
                    >
                      <Radio.Button value="rate">折扣 (折)</Radio.Button>
                      <Radio.Button value="amount">减免 (元)</Radio.Button>
                    </Radio.Group>

                    <div style={{ marginBottom: 4 }}>优惠力度:</div>
                    <InputNumber 
                      value={room.discount_rate < 0 ? Math.abs(room.discount_rate) : room.discount_rate} 
                      onChange={(val) => {
                        const type = room._discountType || (room.discount_rate < 0 ? 'amount' : 'rate')
                        const newVal = type === 'amount' ? -Math.abs(val) : Math.abs(val)
                        handleChange(index, 'discount_rate', newVal)
                      }}
                      placeholder={room._discountType === 'amount' || room.discount_rate < 0 ? "输入减免金额" : "输入折扣 (0-10)"}
                      step={0.5}
                      style={{ width: '100%' }}
                      addonAfter={room._discountType === 'amount' || room.discount_rate < 0 ? '元' : '折'}
                    />
                    <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                      {room.discount_rate < 0 ? `固定减免 ${Math.abs(room.discount_rate)} 元` : (room.discount_rate > 0 && room.discount_rate <= 10 ? `${room.discount_rate} 折优惠` : '无折扣')}
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ marginBottom: 4 }}>优惠配额 (间):</div>
                    <InputNumber 
                      value={room.discount_quota} 
                      onChange={(val) => handleChange(index, 'discount_quota', val)}
                      min={0}
                      style={{ width: '100%' }} 
                    />
                  </div>
                </div>
              }
              title={null}
              trigger="click"
            >
              <GlassButton type={room.discount_rate ? 'primary' : 'default'} ghost={!!room.discount_rate} size="small" icon={<PercentageOutlined />}>
                {room.discount_rate ? '已设优惠' : '优惠'}
              </GlassButton>
            </Popover>
          </Col>
          <Col span={4}><GlassButton type="link" danger icon={<DeleteOutlined />} onClick={() => handleRemove(index)}>删除</GlassButton></Col>
        </Row>
      ))}

      {approvedRequests.length > 0 && (
        <div style={{ padding: '8px 12px', background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>已通过申请（点击添加/撤销）：</Typography.Text>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {approvedRequests.map((req, idx) => {
              const exists = value.some((room) => room && room.name === req.name)
              const price = req.data?.price ?? 0
              const stock = req.data?.stock ?? 0
              return (
                <div key={`${req.id || req.name}-${idx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ fontSize: 13 }}>
                    <Tag color={exists ? 'default' : 'green'} style={{ marginRight: 8 }}>{req.name}</Tag>
                    <span style={{ color: '#999' }}>¥{price} / 库存 {stock}</span>
                  </div>
                  <GlassButton size="small" onClick={() => onReuseApproved?.(req, exists ? 'remove' : 'add')}>
                    {exists ? '撤销' : '添加'}
                  </GlassButton>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {pendingRequests.length > 0 && (
        <div style={{ padding: '8px 12px', background: '#fffbe6', borderRadius: 8 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>待审核房型：</Typography.Text>
          {pendingRequests.map((req, idx) => (<Tag key={idx} color="orange" style={{ marginLeft: 8 }}>{req.name} - 审核中</Tag>))}
        </div>
      )}

      {showPresets && (
        <Card size="small" style={{ background: '#fafafa' }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>点击添加预设房型：</Typography.Text>
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {presetRoomTypes.map(preset => (
              <Tag key={preset.name} style={{ cursor: 'pointer', padding: '4px 12px' }} onClick={() => handleAddPreset(preset)}>
                {preset.name} (¥{preset.default_price || preset.defaultPrice})
              </Tag>
            ))}
          </div>
        </Card>
      )}

      {showCustomInput && (
        <Card size="small" style={{ background: '#f6ffed' }}>
          <Typography.Text style={{ fontSize: 12 }}>申请新房型（需管理员审核）：</Typography.Text>
          <Row gutter={8} style={{ marginTop: 8 }}>
            <Col span={8}><Input placeholder="房型名称" value={customRoom.name} onChange={(e) => setCustomRoom({ ...customRoom, name: e.target.value })} /></Col>
            <Col span={6}><InputNumber placeholder="价格" value={customRoom.price} onChange={(val) => setCustomRoom({ ...customRoom, price: val })} min={0} style={{ width: '100%' }} prefix="¥" /></Col>
            <Col span={4}><InputNumber placeholder="库存" value={customRoom.stock} onChange={(val) => setCustomRoom({ ...customRoom, stock: val })} min={0} style={{ width: '100%' }} /></Col>
            <Col span={6}><Space><GlassButton type="primary" onClick={handleRequestNew}>提交</GlassButton><GlassButton onClick={() => setShowCustomInput(false)}>取消</GlassButton></Space></Col>
          </Row>
        </Card>
      )}

      <Row gutter={8}>
        <Col><GlassButton type="dashed" icon={<PlusOutlined />} onClick={() => setShowPresets(!showPresets)}>{showPresets ? '收起预设' : '选择预设房型'}</GlassButton></Col>
        <Col><GlassButton type="dashed" icon={<PlusOutlined />} onClick={() => setShowCustomInput(!showCustomInput)}>申请自定义房型</GlassButton></Col>
      </Row>
    </div>
  )
}

// ========== 优惠管理组件 ==========
function PromotionManager({ value = [], onChange, pendingRequests = [], approvedRequests = [], onRequestNew, onReuseApproved, presetPromotionTypes = [] }) {
  const [showPresets, setShowPresets] = useState(false)
  const [customPromo, setCustomPromo] = useState({ type: '', title: '', value: 0 })
  const [showCustomInput, setShowCustomInput] = useState(false)

  const handleAddPreset = (preset) => {
    onChange?.([...value, { type: preset.type, title: preset.label, value: 9 }])
    message.success(`已添加${preset.label}`)
  }

  const handleRemove = (index) => onChange?.(value.filter((_, idx) => idx !== index))

  const handleChange = (index, field, val) => {
    const newValue = [...value]
    newValue[index] = { ...newValue[index], [field]: val }
    onChange?.(newValue)
  }

  const handleRequestNew = () => {
    if (!customPromo.title.trim()) { message.error('请输入优惠标题'); return }
    onRequestNew?.(customPromo)
    setCustomPromo({ type: '', title: '', value: 0 })
    setShowCustomInput(false)
    message.success('已提交申请，等待管理员审核')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 12 }}>
      {value.map((promo, index) => (
        <Row gutter={16} key={index} align="middle">
          <Col span={6}><Input value={promo.type} onChange={(e) => handleChange(index, 'type', e.target.value)} placeholder="类型" /></Col>
          <Col span={10}><Input value={promo.title} onChange={(e) => handleChange(index, 'title', e.target.value)} placeholder="优惠标题" /></Col>
          <Col span={4}>
            <InputNumber 
              value={promo.value} 
              onChange={(val) => handleChange(index, 'value', val)} 
              style={{ width: '100%' }} 
              placeholder="数值"
              addonAfter={promo.value < 0 ? '元' : (promo.value > 10 ? '元' : '折')}
            />
          </Col>
          <Col span={4}><GlassButton type="link" danger icon={<DeleteOutlined />} onClick={() => handleRemove(index)}>删除</GlassButton></Col>
        </Row>
      ))}

      {approvedRequests.length > 0 && (
        <div style={{ padding: '8px 12px', background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>已通过申请（点击添加/撤销）：</Typography.Text>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                      {valueText < 0 ? `减免 ${Math.abs(valueText)} 元` : (valueText > 10 ? `减免 ${valueText} 元` : `${valueText} 折`)}
                    </span>
                  </div>
                  <GlassButton size="small" onClick={() => onReuseApproved?.(req, exists ? 'remove' : 'add')}>
                    {exists ? '撤销' : '添加'}
                  </GlassButton>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {pendingRequests.length > 0 && (
        <div style={{ padding: '8px 12px', background: '#fffbe6', borderRadius: 8 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>待审核优惠：</Typography.Text>
          {pendingRequests.map((req, idx) => (<Tag key={idx} color="orange" style={{ marginLeft: 8 }}>{req.title} - 审核中</Tag>))}
        </div>
      )}

      {showPresets && (
        <Card size="small" style={{ background: '#fafafa' }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>点击添加预设优惠：</Typography.Text>
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {presetPromotionTypes.map(preset => (
              <Tag key={preset.type} style={{ cursor: 'pointer', padding: '4px 12px' }} onClick={() => handleAddPreset(preset)}>{preset.label}</Tag>
            ))}
          </div>
        </Card>
      )}

      {showCustomInput && (
        <Card size="small" style={{ background: '#f6ffed' }}>
          <Typography.Text style={{ fontSize: 12 }}>申请新优惠（需管理员审核）：</Typography.Text>
          <Row gutter={8} style={{ marginTop: 8 }}>
            <Col span={6}><Input placeholder="类型" value={customPromo.type} onChange={(e) => setCustomPromo({ ...customPromo, type: e.target.value })} /></Col>
            <Col span={10}><Input placeholder="优惠标题" value={customPromo.title} onChange={(e) => setCustomPromo({ ...customPromo, title: e.target.value })} /></Col>
            <Col span={4}>
              <InputNumber 
                placeholder="数值" 
                value={customPromo.value} 
                onChange={(val) => setCustomPromo({ ...customPromo, value: val })} 
                style={{ width: '100%' }} 
              />
            </Col>
            <Col span={4}><Space><GlassButton type="primary" onClick={handleRequestNew}>提交</GlassButton><GlassButton onClick={() => setShowCustomInput(false)}>取消</GlassButton></Space></Col>
          </Row>
        </Card>
      )}

      <Row gutter={8}>
        <Col><GlassButton type="dashed" icon={<PlusOutlined />} onClick={() => setShowPresets(!showPresets)}>{showPresets ? '收起预设' : '选择预设优惠'}</GlassButton></Col>
        <Col><GlassButton type="dashed" icon={<PlusOutlined />} onClick={() => setShowCustomInput(!showCustomInput)}>申请自定义优惠</GlassButton></Col>
      </Row>
    </div>
  )
}

// ========== 周边信息组件 ==========
function NearbyInfoEditor({ attractions = [], transport = [], malls = [], onChangeAttractions, onChangeTransport, onChangeMalls }) {
  const [searchText, setSearchText] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchType, setSearchType] = useState('all') // all, attraction, transport, mall

  // 通过高德 API 搜索周边
  const handleSearch = async () => {
    if (!searchText.trim()) return
    
    setSearching(true)
    try {
      // 根据类型设置搜索关键词
      let keywords = searchText
      if (searchType === 'attraction') keywords += ' 景点|公园|博物馆|名胜'
      else if (searchType === 'transport') keywords += ' 地铁站|公交站|火车站|机场'
      else if (searchType === 'mall') keywords += ' 商场|购物中心|超市|百货'
      
      const result = await api.get(`/api/map/search?keywords=${encodeURIComponent(keywords)}`)
      
      if (result.success && result.data && result.data.length > 0) {
        const results = result.data.map(poi => {
          // 根据POI类型判断分类
          let type = 'attraction'
          const typeName = (poi.type || '').toLowerCase()
          if (typeName.includes('交通') || typeName.includes('地铁') || typeName.includes('公交') || typeName.includes('站')) {
            type = 'transport'
          } else if (typeName.includes('购物') || typeName.includes('商场') || typeName.includes('超市') || typeName.includes('百货')) {
            type = 'mall'
          }
          
          return {
            name: poi.name,
            address: poi.address || '',
            distance: (poi.distance && !isNaN(parseFloat(poi.distance))) ? `${poi.distance}米` : '未知',
            type: type
          }
        })
        setSearchResults(results)
      } else {
        message.warning(result.message || '未找到相关地点')
        setSearchResults([])
      }
    } catch (err) {
      console.error('搜索失败:', err)
      message.error('搜索失败，请重试')
    } finally {
      setSearching(false)
    }
  }

  const handleAdd = (item) => {
    const info = item.distance !== '未知' ? `${item.name}(${item.distance})` : item.name
    if (item.type === 'attraction' && !attractions.includes(info)) { onChangeAttractions?.([...attractions, info]); message.success('已添加景点') }
    else if (item.type === 'transport' && !transport.includes(info)) { onChangeTransport?.([...transport, info]); message.success('已添加交通信息') }
    else if (item.type === 'mall' && !malls.includes(info)) { onChangeMalls?.([...malls, info]); message.success('已添加商场信息') }
  }

  const typeOptions = [
    { value: 'all', label: '全部' },
    { value: 'attraction', label: '景点' },
    { value: 'transport', label: '交通' },
    { value: 'mall', label: '商场' }
  ]

  const getTypeTag = (type) => {
    if (type === 'attraction') return <Tag color="green">景点</Tag>
    if (type === 'transport') return <Tag color="blue">交通</Tag>
    if (type === 'mall') return <Tag color="orange">商场</Tag>
    return <Tag>其他</Tag>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 16 }}>
      <Card size="small" title="搜索周边信息（高德地图）">
        <Row gutter={8}>
          <Col flex="auto">
            <Input 
              placeholder="搜索周边景点、交通、商场..." 
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
          <Col><GlassButton onClick={handleSearch} loading={searching}>搜索</GlassButton></Col>
        </Row>
        {searchResults.length > 0 && (
          <div style={{ marginTop: 12, maxHeight: 250, overflow: 'auto' }}>
            {searchResults.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ flex: 1 }}>
                  <span>{item.name}</span>
                  {getTypeTag(item.type)}
                  {item.distance !== '未知' && <Tag style={{ marginLeft: 4 }}>{item.distance}</Tag>}
                  {item.address && <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{item.address}</div>}
                </div>
                <GlassButton type="link" size="small" onClick={() => handleAdd(item)}>添加</GlassButton>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Row gutter={16}>
        <Col span={8}>
          <Card size="small" title="附近景点">
            <Select mode="tags" style={{ width: '100%' }} value={attractions} onChange={onChangeAttractions} placeholder="输入或搜索添加" tokenSeparators={[',']} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" title="交通信息">
            <Select mode="tags" style={{ width: '100%' }} value={transport} onChange={onChangeTransport} placeholder="输入或搜索添加" tokenSeparators={[',']} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" title="商场信息">
            <Select mode="tags" style={{ width: '100%' }} value={malls} onChange={onChangeMalls} placeholder="输入或搜索添加" tokenSeparators={[',']} />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

// ========== 预览组件 ==========
function HotelPreview({ data }) {
  if (!data) return null

  const roomColumns = [
    { title: '房型名称', dataIndex: 'name', key: 'name' },
    { 
      title: '价格', 
      key: 'price', 
      render: (_, record) => {
        const price = Number(record.price) || 0
        const discount = Number(record.discount_rate) || 0
        let finalPrice = price
        let discountText = ''

        if (discount > 0 && discount <= 10) {
          finalPrice = price * (discount / 10)
          discountText = `${discount}折`
        } else if (discount < 0) {
          finalPrice = Math.max(0, price + discount)
          discountText = `减¥${Math.abs(discount)}`
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
    { title: '库存', dataIndex: 'stock', key: 'stock', render: (v) => v || 0 }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 16 }}>
      <Card styles={{ body: { padding: 0 } }} style={{ overflow: 'hidden' }}>
        {data.images && data.images.length > 0 ? (
          <div style={{ position: 'relative' }}>
            <Image src={data.images[0]} alt={data.name} width="100%" height={200} style={{ objectFit: 'cover' }} fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88P/BfwYACP4D/pHOlKYAAAAASUVORK5CYII=" />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', padding: '30px 16px 16px', color: '#fff' }}>
              <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>{data.name || '酒店名称'}</Typography.Title>
              {data.name_en && <Typography.Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>{data.name_en}</Typography.Text>}
            </div>
            {data.images.length > 1 && <div style={{ position: 'absolute', bottom: 60, right: 16, background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>共 {data.images.length} 张</div>}
          </div>
        ) : (
          <div style={{ height: 120, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography.Text type="secondary">暂无图片</Typography.Text>
          </div>
        )}
      </Card>

      <Card size="small" title="基本信息">
        <Descriptions column={2} size="small">
          <Descriptions.Item label={<><EnvironmentOutlined /> 城市</>}>{data.city || '-'}</Descriptions.Item>
          <Descriptions.Item label="地址">{data.address || '-'}</Descriptions.Item>
          <Descriptions.Item label={<><StarFilled style={{ color: '#faad14' }} /> 星级</>}>{data.star_rating ? `${data.star_rating} 星级` : '未评级'}</Descriptions.Item>
          <Descriptions.Item label={<><CalendarOutlined /> 开业时间</>}>{data.opening_time ? (typeof data.opening_time === 'object' ? data.opening_time.format?.('YYYY-MM-DD') : data.opening_time) : '未填写'}</Descriptions.Item>
        </Descriptions>
        {data.description && <Typography.Paragraph style={{ marginTop: 12, marginBottom: 0 }} ellipsis={{ rows: 2 }}>{data.description}</Typography.Paragraph>}
      </Card>

      {data.facilities && data.facilities.length > 0 && (
        <Card size="small" title="设施服务">
          <Space wrap size={[4, 4]}>{data.facilities.map((item, index) => (<Tag key={index} color="blue">{item}</Tag>))}</Space>
        </Card>
      )}

      <Card size="small" title="房型信息">
        <Table columns={roomColumns} dataSource={(data.roomTypes || []).filter(r => r && r.name)} rowKey={(_, index) => index} pagination={false} size="small" locale={{ emptyText: '暂无房型' }} />
      </Card>

      {data.promotions && data.promotions.filter(p => p && p.title).length > 0 && (
        <Card size="small" title="优惠活动">
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 4 }}>
            {data.promotions.filter(p => p && p.title).map((promo, index) => (
              <div key={index} style={{ padding: '6px 10px', background: '#fff7e6', borderRadius: 4, fontSize: 13 }}>
                {promo.type && <Tag color="orange" style={{ marginRight: 8 }}>{promo.type}</Tag>}
                <span>{promo.title}</span>
                {promo.value && <span style={{ color: '#f5222d', marginLeft: 8 }}>{promo.value}折</span>}
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

  // 预设数据 state
  const [presets, setPresets] = useState({
    facilities: [],
    roomTypes: [],
    promotionTypes: [],
    cities: []
  })

  const isEditing = !!id

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
        console.error('加载预设数据失败:', err)
      }
    }
    fetchPresets()
  }, [])

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
        console.error('获取已通过申请失败:', error)
      }
    }
    fetchApprovedRequests()
  }, [])

  useEffect(() => {
    if (id) {
      const fetchHotel = async () => {
        setLoading(true)
        try {
          const data = await api.get(`/api/merchant/hotels/${id}`)
          form.setFieldsValue({
            ...data,
            opening_time: data.opening_time ? dayjs(data.opening_time) : null,
            roomTypes: data.roomTypes || [],
            facilities: data.facilities || [],
            images: data.images || [],
            nearby_attractions: data.nearby_attractions || [],
            nearby_transport: data.nearby_transport || [],
            nearby_malls: data.nearby_malls || [],
            promotions: data.promotions || []
          })
          setPreviewData(data)
        } catch (error) { 
          console.error('获取酒店详情失败:', error)
          message.error('获取酒店详情失败')
          navigate('/hotels')
        }
        finally { setLoading(false) }
      }
      fetchHotel()
    }
  }, [id, navigate, form])

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
      message.success('设施申请已提交，等待管理员审核')
    } catch (error) {
      console.error('提交设施申请失败:', error)
      message.error('提交申请失败')
    }
  }
  
  // 提交房型申请到后端
  const handleRequestRoomType = async (room) => {
    try {
      await api.post('/api/requests', {
        hotelId: id ? parseInt(id) : null,
        type: 'room_type',
        name: room.name,
        data: { price: room.price, stock: room.stock }
      })
      setPendingRoomTypes([...pendingRoomTypes, { ...room, status: 'pending' }])
      message.success('房型申请已提交，等待管理员审核')
    } catch (error) {
      console.error('提交房型申请失败:', error)
      message.error('提交申请失败')
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
      message.success('优惠申请已提交，等待管理员审核')
    } catch (error) {
      console.error('提交优惠申请失败:', error)
      message.error('提交申请失败')
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
        roomTypes: [...current, { name: req.name, price: req.data?.price || 0, stock: req.data?.stock || 0 }]
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
      const payload = {
        ...values,
        star_rating: Number(values.star_rating || 0),
        opening_time: values.opening_time ? values.opening_time.format('YYYY-MM-DD') : '',
        nearby_attractions: Array.isArray(nearbyAttractions) ? nearbyAttractions : [],
        nearby_transport: Array.isArray(nearbyTransport) ? nearbyTransport : [],
        nearby_malls: Array.isArray(nearbyMalls) ? nearbyMalls : [],
        roomTypes: (values.roomTypes || []).filter((room) => room && room.name),
        promotions: (values.promotions || []).filter((promo) => promo && promo.title)
      }
      setSaving(true)
      if (isEditing) {
        await api.put(`/api/merchant/hotels/${id}`, payload)
      } else {
        await api.post('/api/merchant/hotels', payload)
      }
      message.success('保存成功')
      navigate('/hotels')
    } catch (err) {
      if (err.errorFields) message.error('请填写必填项')
      else message.error('保存失败')
    } finally { setSaving(false) }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>

  const tabItems = [
    {
      key: 'edit',
      label: <span><EditOutlined /> 编辑信息</span>,
      children: (
        <Form layout="vertical" form={form} initialValues={{ star_rating: 0 }} onValuesChange={handleFormChange}>
          <Typography.Title level={5}>地址信息</Typography.Title>
          <MapPicker onAddressChange={({ city, address }) => { form.setFieldsValue({ city, address }); handleFormChange() }} hotCities={presets.cities} />
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="city" label="城市" rules={[{ required: true, message: '请选择或输入城市' }]}>
                <Select showSearch placeholder="选择或输入城市" options={presets.cities.map(c => ({ value: c.name || c, label: c.name || c }))} filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())} allowClear onChange={handleFormChange} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="address" label="详细地址" rules={[{ required: true, message: '请输入地址' }]}>
                <Input placeholder="请输入详细地址" />
              </Form.Item>
            </Col>
          </Row>

          <Divider />
          <Typography.Title level={5}>基本信息</Typography.Title>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="name" label="酒店名称（中文）" rules={[{ required: true, message: '请输入酒店中文名' }]}><Input placeholder="请输入酒店中文名" /></Form.Item></Col>
            <Col span={12}><Form.Item name="name_en" label="酒店名称（英文）"><Input placeholder="请输入酒店英文名" /></Form.Item></Col>
            <Col span={12}>
              <Form.Item name="star_rating" label="星级">
                <Select options={[{ value: 0, label: '未评级' }, { value: 1, label: '⭐ 一星' }, { value: 2, label: '⭐⭐ 二星' }, { value: 3, label: '⭐⭐⭐ 三星' }, { value: 4, label: '⭐⭐⭐⭐ 四星' }, { value: 5, label: '⭐⭐⭐⭐⭐ 五星' }]} />
              </Form.Item>
            </Col>
            <Col span={12}><Form.Item name="opening_time" label="开业时间"><DatePicker style={{ width: '100%' }} placeholder="选择开业日期" /></Form.Item></Col>
            <Col span={24}><Form.Item name="description" label="酒店描述"><Input.TextArea rows={3} placeholder="请输入酒店描述" /></Form.Item></Col>
          </Row>

          <Divider />
          <Typography.Title level={5}>酒店图片</Typography.Title>
          <Form.Item name="images"><ImageUploader /></Form.Item>

          <Divider />
          <Typography.Title level={5}>设施服务</Typography.Title>
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
          <Typography.Title level={5}>周边信息</Typography.Title>
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
          <Typography.Title level={5}>房型信息</Typography.Title>
          <Form.Item name="roomTypes">
            <RoomTypeManager
              pendingRequests={pendingRoomTypes}
              approvedRequests={approvedRoomTypes}
              onRequestNew={handleRequestRoomType}
              onReuseApproved={handleReuseRoomType}
              presetRoomTypes={presets.roomTypes}
            />
          </Form.Item>

          <Divider />
          <Typography.Title level={5}>优惠活动</Typography.Title>
          <Form.Item name="promotions">
            <PromotionManager
              pendingRequests={pendingPromotions}
              approvedRequests={approvedPromotions}
              onRequestNew={handleRequestPromotion}
              onReuseApproved={handleReusePromotion}
              presetPromotionTypes={presets.promotionTypes}
            />
          </Form.Item>
        </Form>
      )
    },
    { key: 'preview', label: <span><EyeOutlined /> 预览效果</span>, children: <HotelPreview data={previewData} /> }
  ]

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>{isEditing ? '编辑酒店' : '新增酒店'}</Typography.Title>
        <Space>
          <GlassButton onClick={() => navigate('/hotels')}>取消</GlassButton>
          <GlassButton type="primary" loading={saving} onClick={handleSubmit}>{isEditing ? '保存修改' : '提交审核'}</GlassButton>
        </Space>
      </div>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
    </>
  )
}
