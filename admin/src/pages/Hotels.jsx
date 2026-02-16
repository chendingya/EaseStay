import { Card, Table, Tag, Space, Typography, Input, Select, Modal, Upload, Alert, Row, Col, Popconfirm } from 'antd'
import { useCallback, useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchOutlined, UploadOutlined, DownloadOutlined, InboxOutlined, StopOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { GlassButton, glassMessage as message } from '../components'
import { api } from '../services'
import { useTranslation } from 'react-i18next'

const getTemplateFields = (t) => [
  { field: 'name', label: t('hotels.template.name'), required: true, example: t('hotels.template.example.name') },
  { field: 'name_en', label: t('hotels.template.nameEn'), required: false, example: t('hotels.template.example.nameEn') },
  { field: 'city', label: t('hotels.template.city'), required: true, example: t('hotels.template.example.city') },
  { field: 'address', label: t('hotels.template.address'), required: true, example: t('hotels.template.example.address') },
  { field: 'star_rating', label: t('hotels.template.star'), required: false, example: t('hotels.template.example.star') },
  { field: 'opening_time', label: t('hotels.template.openingTime'), required: false, example: t('hotels.template.example.openingTime') },
  { field: 'description', label: t('hotels.template.description'), required: false, example: t('hotels.template.example.description') },
  { field: 'facilities', label: t('hotels.template.facilities'), required: false, example: t('hotels.template.example.facilities') },
  { field: 'images', label: t('hotels.template.images'), required: false, example: t('hotels.template.example.images') },
  { field: 'nearby_attractions', label: t('hotels.template.nearbyAttractions'), required: false, example: t('hotels.template.example.nearbyAttractions') },
  { field: 'nearby_transport', label: t('hotels.template.nearbyTransport'), required: false, example: t('hotels.template.example.nearbyTransport') },
  { field: 'nearby_malls', label: t('hotels.template.nearbyMalls'), required: false, example: t('hotels.template.example.nearbyMalls') },
]

// 生成CSV模板
const generateTemplate = (templateFields, t) => {
  const headers = templateFields.map(f => f.field).join(',')
  const examples = templateFields.map(f => `"${f.example}"`).join(',')
  const csv = `${headers}\n${examples}`
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = t('hotels.template.fileName')
  a.click()
  URL.revokeObjectURL(url)
}

// 解析CSV内容
const parseCSV = (text, templateFields, t) => {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const data = []
  const listFields = new Set(['facilities', 'images', 'nearby_attractions', 'nearby_transport', 'nearby_malls'])
  const parseList = (val) => val ? val.split(/[|,，]/).map(s => s.trim()).filter(Boolean) : []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || []
    const hasValue = values.some(v => v && v.trim() !== '')
    if (!hasValue) {
      continue
    }
    const row = {}
    headers.forEach((h, idx) => {
      let val = values[idx]?.trim().replace(/^"|"$/g, '') || ''
      if (listFields.has(h)) {
        row[h] = parseList(val)
      } else if (h === 'star_rating' && val) {
        row[h] = parseInt(val) || 0
      } else {
        row[h] = val
      }
    })
    const errors = []
    templateFields.forEach((field) => {
      if (field.required) {
        const value = row[field.field]
        const valid = Array.isArray(value) ? value.length > 0 : !!String(value || '').trim()
        if (!valid) {
          errors.push(t('hotels.import.missingField', { field: field.label }))
        }
      }
    })
    if (row.star_rating !== undefined && row.star_rating !== '') {
      const rating = Number(row.star_rating)
      if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
        errors.push(t('hotels.import.starInvalid'))
      }
    }
    if (row.opening_time) {
      const normalizedOpeningTime = row.opening_time.replace(/\//g, '-')
      if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedOpeningTime)) {
        errors.push(t('hotels.import.openingTimeInvalid'))
      } else {
        row.opening_time = normalizedOpeningTime
      }
    }
    row._errors = errors
    data.push(row)
  }
  return data
}

export default function Hotels() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [hotels, setHotels] = useState([])
  const [loading, setLoading] = useState(false)
  const role = localStorage.getItem('role')
  
  // 搜索相关
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [cityFilter, setCityFilter] = useState('all')
  
  // 导入相关
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importData, setImportData] = useState([])
  const [importing, setImporting] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteNameFirst, setDeleteNameFirst] = useState('')
  const [deleteNameSecond, setDeleteNameSecond] = useState('')
  const [deleting, setDeleting] = useState(false)
  const templateFields = useMemo(() => getTemplateFields(t), [t])

  const fetchHotels = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get('/api/merchant/hotels')
      setHotels(data)
    } catch (error) {
      console.error('获取酒店列表失败:', error)
      message.error(t('hotels.fetchError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (role === 'merchant') {
      fetchHotels()
    }
  }, [role, fetchHotels])

  // 获取城市列表
  const cityOptions = useMemo(() => {
    const cities = [...new Set(hotels.map(h => h.city).filter(Boolean))]
    return [{ value: 'all', label: t('hotels.filter.allCities') }, ...cities.map(c => ({ value: c, label: c }))]
  }, [hotels, t])

  // 筛选后的数据
  const filteredHotels = useMemo(() => {
    return hotels.filter(hotel => {
      const matchSearch = !searchText || 
        hotel.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        hotel.name_en?.toLowerCase().includes(searchText.toLowerCase())
      const matchStatus = statusFilter === 'all' || hotel.status === statusFilter
      const matchCity = cityFilter === 'all' || hotel.city === cityFilter
      return matchSearch && matchStatus && matchCity
    })
  }, [hotels, searchText, statusFilter, cityFilter])

  // 商户更新酒店状态
  const handleUpdateStatus = async (hotelId, action) => {
    try {
      await api.patch(`/api/merchant/hotels/${hotelId}/status`, { action })
      message.success(action === 'offline' ? t('hotels.status.offlineSuccess') : t('hotels.status.restoreSuccess'))
      fetchHotels()
    } catch (error) {
      console.error('更新酒店状态失败:', error)
      message.error(t('common.errorRetry'))
    }
  }

  // 处理文件上传
  const handleFileUpload = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target.result
        const data = parseCSV(text, templateFields, t)
        if (data.length === 0) {
          message.error(t('hotels.import.emptyData'))
          return
        }
        setImportData(data)
        const validCount = data.filter(item => !item._errors || item._errors.length === 0).length
        message.success(t('hotels.import.parseSuccess', { total: data.length, valid: validCount }))
      } catch (error) {
        console.error('解析导入文件失败:', error)
        message.error(t('hotels.import.parseError'))
      }
    }
    reader.readAsText(file, 'UTF-8')
    return false // 阻止自动上传
  }

  // 执行导入
  const handleImport = async () => {
    const validData = importData.filter(item => !item._errors || item._errors.length === 0)
    if (validData.length === 0) {
      message.warning(t('hotels.import.noValidData'))
      return
    }
    
    setImporting(true)
    let successCount = 0
    let failCount = 0
    
    for (const hotel of validData) {
      try {
        await api.post('/api/merchant/hotels', hotel)
        successCount++
      } catch (error) {
        console.error('导入酒店失败:', error)
        failCount++
      }
    }
    
    setImporting(false)
    
    if (successCount > 0) {
      const ignoredCount = importData.length - validData.length
      message.success(t('hotels.import.finish', { success: successCount, fail: failCount, ignored: ignoredCount }))
      setImportModalOpen(false)
      setImportData([])
      fetchHotels()
    } else {
      message.error(t('hotels.import.finishError'))
    }
  }

  const openDeleteModal = (record) => {
    setDeleteTarget(record)
    setDeleteNameFirst('')
    setDeleteNameSecond('')
    setDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    setDeleteModalOpen(false)
    setDeleteTarget(null)
    setDeleteNameFirst('')
    setDeleteNameSecond('')
  }

  const handleDeleteRequest = async () => {
    if (!deleteTarget) {
      return
    }
    const targetName = deleteTarget.name || ''
    if (deleteNameFirst.trim() !== targetName || deleteNameSecond.trim() !== targetName) {
      message.warning(t('hotels.delete.nameMismatch'))
      return
    }
    setDeleting(true)
    try {
      await api.post('/api/requests', {
        hotelId: deleteTarget.id,
        type: 'hotel_delete',
        name: targetName,
        data: { hotelName: targetName }
      })
      message.success(t('hotels.delete.submitSuccess'))
      closeDeleteModal()
      fetchHotels()
    } catch (error) {
      console.error('提交删除申请失败:', error)
      message.error(t('hotels.delete.submitError'))
    } finally {
      setDeleting(false)
    }
  }

  const exportHotels = () => {
    if (filteredHotels.length === 0) {
      message.warning(t('hotels.export.empty'))
      return
    }
    const headers = templateFields.map(f => f.field).join(',')
    const rows = filteredHotels.map((hotel) => {
      return templateFields.map((field) => {
        const value = hotel[field.field]
        const normalized = Array.isArray(value) ? value.join('|') : (value ?? '')
        const safe = String(normalized).replace(/"/g, '""')
        return `"${safe}"`
      }).join(',')
    })
    const csv = `${headers}\n${rows.join('\n')}`
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = t('hotels.export.fileName')
    a.click()
    URL.revokeObjectURL(url)
  }

  const statusMap = {
    pending: { color: 'orange', label: t('status.pending') },
    approved: { color: 'green', label: t('status.approved') },
    rejected: { color: 'red', label: t('status.rejected') },
    offline: { color: 'default', label: t('status.offline') }
  }

  const columns = [
    { title: t('hotels.columns.name'), dataIndex: 'name', width: 180, ellipsis: true },
    { title: t('hotels.columns.nameEn'), dataIndex: 'name_en', width: 220, ellipsis: true },
    { title: t('hotels.columns.city'), dataIndex: 'city', width: 80 },
    { title: t('hotels.columns.star'), dataIndex: 'star_rating', width: 60 },
    { title: t('hotels.columns.lowestPrice'), dataIndex: 'lowestPrice', width: 80, render: (v) => v ? t('hotels.priceValue', { value: v }) : '-' },
    { title: t('hotels.columns.openingTime'), dataIndex: 'opening_time', width: 100 },
    {
      title: t('hotels.columns.status'),
      dataIndex: 'status',
      width: 80,
      render: (value) => {
        const info = statusMap[value] || { color: 'default', label: value }
        return <Tag color={info.color}>{info.label}</Tag>
      }
    },
    {
      title: t('hotels.columns.action'),
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {record.status === 'approved' && (
            <>
              <GlassButton type="link" size="small" onClick={() => navigate(`/hotels/${record.id}`)}>{t('common.view')}</GlassButton>
              <Popconfirm
                title={t('hotels.offline.confirmTitle')}
                description={t('hotels.offline.confirmDesc')}
                onConfirm={() => handleUpdateStatus(record.id, 'offline')}
                okText={t('common.confirm')}
                cancelText={t('common.cancel')}
              >
                <GlassButton type="link" size="small" danger icon={<StopOutlined />}>{t('hotels.action.offline')}</GlassButton>
              </Popconfirm>
            </>
          )}
          {record.status === 'offline' && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t('hotels.offline.note')}
            </Typography.Text>
          )}
          <GlassButton type="link" size="small" onClick={() => navigate(`/hotels/edit/${record.id}`)}>{t('common.edit')}</GlassButton>
          <GlassButton type="link" size="small" danger onClick={() => openDeleteModal(record)}>{t('common.delete')}</GlassButton>
        </Space>
      )
    }
  ]

  // 预览表格列
  const previewColumns = [
    { title: t('hotels.preview.name'), dataIndex: 'name', ellipsis: true },
    { title: t('hotels.preview.city'), dataIndex: 'city', width: 80 },
    { title: t('hotels.preview.address'), dataIndex: 'address', ellipsis: true },
    { title: t('hotels.preview.star'), dataIndex: 'star_rating', width: 60 },
    { title: t('hotels.preview.facilities'), dataIndex: 'facilities', render: (v) => v?.join('、') || '-', ellipsis: true },
    { title: t('hotels.preview.validation'), dataIndex: '_errors', render: (v) => v?.length ? v.join('；') : t('hotels.preview.valid'), width: 200 }
  ]

  return (
    <Card
      title={<Typography.Title level={5} style={{ margin: 0 }}>{t('hotels.title')}</Typography.Title>}
      extra={
        <Space>
          <GlassButton icon={<UploadOutlined />} onClick={() => setImportModalOpen(true)}>{t('hotels.actions.import')}</GlassButton>
          <GlassButton icon={<DownloadOutlined />} onClick={exportHotels}>{t('hotels.actions.export')}</GlassButton>
          <GlassButton type="primary" onClick={() => navigate('/hotels/new')}>{t('hotels.actions.new')}</GlassButton>
        </Space>
      }
    >
      {/* 搜索筛选区 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Input
            placeholder={t('hotels.filter.searchPlaceholder')}
            prefix={<SearchOutlined style={{ color: '#bbb' }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
        </Col>
        <Col span={4}>
          <Select
            style={{ width: '100%' }}
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: t('hotels.filter.allStatus') },
              { value: 'pending', label: t('status.pending') },
              { value: 'approved', label: t('status.approved') },
              { value: 'rejected', label: t('status.rejected') },
              { value: 'offline', label: t('status.offline') },
            ]}
          />
        </Col>
        <Col span={4}>
          <Select
            style={{ width: '100%' }}
            value={cityFilter}
            onChange={setCityFilter}
            options={cityOptions}
          />
        </Col>
        <Col span={8} style={{ textAlign: 'right' }}>
          <Typography.Text type="secondary">
            {t('hotels.total', { count: filteredHotels.length })}
          </Typography.Text>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={filteredHotels}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 8 }}
        size="middle"
        scroll={{ x: 980 }}
      />

      {/* 导入弹窗 */}
      <Modal
        title={t('hotels.import.title')}
        open={importModalOpen}
        onCancel={() => {
          setImportModalOpen(false)
          setImportData([])
        }}
        width={800}
        footer={
          <Space>
            <GlassButton icon={<DownloadOutlined />} onClick={() => generateTemplate(templateFields, t)}>
              {t('hotels.import.downloadTemplate')}
            </GlassButton>
            <GlassButton onClick={() => {
              setImportModalOpen(false)
              setImportData([])
            }}>
              {t('common.cancel')}
            </GlassButton>
            <GlassButton
              type="primary"
              loading={importing}
              disabled={importData.length === 0 || importData.every(item => item._errors && item._errors.length > 0)}
              onClick={handleImport}
            >
              {t('hotels.import.confirm', { count: importData.length })}
            </GlassButton>
          </Space>
        }
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title={t('hotels.import.guideTitle')}
          description={
            <div>
              <p style={{ margin: '4px 0' }}>{t('hotels.import.guide1')}</p>
              <p style={{ margin: '4px 0' }}>{t('hotels.import.guide2')}</p>
              <p style={{ margin: '4px 0' }}>{t('hotels.import.guide3')}</p>
              <p style={{ margin: '4px 0' }}>{t('hotels.import.guide4')}</p>
            </div>
          }
        />

        <Upload.Dragger
          accept=".csv"
          beforeUpload={handleFileUpload}
          showUploadList={false}
          style={{ marginBottom: 16 }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">{t('hotels.import.dragText')}</p>
          <p className="ant-upload-hint">{t('hotels.import.dragHint')}</p>
        </Upload.Dragger>

        {importData.length > 0 && (
          <>
            <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
              {t('hotels.preview.title', { count: importData.length })}
            </Typography.Text>
            <Table
              columns={previewColumns}
              dataSource={importData}
              rowKey={(_, idx) => idx}
              size="small"
              pagination={{ pageSize: 5 }}
              scroll={{ y: 200 }}
            />
          </>
        )}
      </Modal>

      <Modal
        title={t('hotels.delete.title')}
        open={deleteModalOpen}
        onCancel={closeDeleteModal}
        onOk={handleDeleteRequest}
        okText={t('hotels.delete.submit')}
        okButtonProps={{ danger: true, disabled: deleting }}
        confirmLoading={deleting}
      >
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          title={t('hotels.delete.warning')}
        />
        <Typography.Text>
          {t('hotels.delete.inputLabel')}
        </Typography.Text>
        <Input
          style={{ marginTop: 8 }}
          placeholder={t('hotels.delete.placeholderFirst')}
          value={deleteNameFirst}
          onChange={(e) => setDeleteNameFirst(e.target.value)}
        />
        <Input
          style={{ marginTop: 8 }}
          placeholder={t('hotels.delete.placeholderSecond')}
          value={deleteNameSecond}
          onChange={(e) => setDeleteNameSecond(e.target.value)}
        />
        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
          {t('hotels.delete.hint')}
        </Typography.Text>
      </Modal>
    </Card>
  )
}
