import { Card, Table, Tag, Space, Typography, Input, Select, Modal, Upload, Alert, Row, Col, Popconfirm } from 'antd'
import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchOutlined, UploadOutlined, DownloadOutlined, InboxOutlined, StopOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { GlassButton, glassMessage as message } from '../components'
import { api } from '../services/request'

const statusMap = {
  pending: { color: 'orange', label: '待审核' },
  approved: { color: 'green', label: '已上架' },
  rejected: { color: 'red', label: '已驳回' },
  offline: { color: 'default', label: '已下线' }
}

// 导入模板字段说明
const templateFields = [
  { field: 'name', label: '酒店名称（中文）', required: true, example: '杭州西湖大酒店' },
  { field: 'name_en', label: '酒店名称（英文）', required: false, example: 'Hangzhou West Lake Hotel' },
  { field: 'city', label: '城市', required: true, example: '杭州' },
  { field: 'address', label: '地址', required: true, example: '西湖区北山街89号' },
  { field: 'star_rating', label: '星级（1-5）', required: false, example: '5' },
  { field: 'opening_time', label: '开业时间（YYYY-MM-DD 或 YYYY/MM/DD）', required: false, example: '2020-01-01' },
  { field: 'description', label: '酒店描述', required: false, example: '坐落于西湖畔的豪华酒店' },
  { field: 'facilities', label: '设施（用 | 或逗号分隔）', required: false, example: '免费WiFi|停车场|游泳池' },
  { field: 'images', label: '图片链接（用 | 或逗号分隔）', required: false, example: 'https://img/1.jpg|https://img/2.jpg' },
  { field: 'nearby_attractions', label: '附近景点（用 | 或逗号分隔）', required: false, example: '西湖|断桥' },
  { field: 'nearby_transport', label: '交通出行（用 | 或逗号分隔）', required: false, example: '地铁1号线|机场大巴' },
  { field: 'nearby_malls', label: '购物商场（用 | 或逗号分隔）', required: false, example: '银泰城|万象城' },
]

// 生成CSV模板
const generateTemplate = () => {
  const headers = templateFields.map(f => f.field).join(',')
  const examples = templateFields.map(f => `"${f.example}"`).join(',')
  const csv = `${headers}\n${examples}`
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '酒店导入模板.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// 解析CSV内容
const parseCSV = (text) => {
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
          errors.push(`缺少必填字段：${field.label}`)
        }
      }
    })
    if (row.star_rating !== undefined && row.star_rating !== '') {
      const rating = Number(row.star_rating)
      if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
        errors.push('星级需为 0-5 的数字')
      }
    }
    if (row.opening_time) {
      const normalizedOpeningTime = row.opening_time.replace(/\//g, '-')
      if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedOpeningTime)) {
        errors.push('开业时间格式需为 YYYY-MM-DD 或 YYYY/MM/DD')
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

  const fetchHotels = async () => {
    setLoading(true)
    try {
      const data = await api.get('/api/merchant/hotels')
      setHotels(data)
    } catch (error) {
      console.error('获取酒店列表失败:', error)
      message.error('获取酒店列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (role === 'merchant') {
      fetchHotels()
    }
  }, [role])

  // 获取城市列表
  const cityOptions = useMemo(() => {
    const cities = [...new Set(hotels.map(h => h.city).filter(Boolean))]
    return [{ value: 'all', label: '全部城市' }, ...cities.map(c => ({ value: c, label: c }))]
  }, [hotels])

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
      message.success(action === 'offline' ? '酒店已下线' : '酒店已恢复上架')
      fetchHotels()
    } catch (error) {
      console.error('更新酒店状态失败:', error)
      message.error('更新状态失败，请重试')
    }
  }

  // 处理文件上传
  const handleFileUpload = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target.result
        const data = parseCSV(text)
        if (data.length === 0) {
          message.error('未解析到有效数据，请检查文件格式')
          return
        }
        setImportData(data)
        const validCount = data.filter(item => !item._errors || item._errors.length === 0).length
        message.success(`解析成功，共 ${data.length} 条数据（可导入 ${validCount} 条）`)
      } catch (error) {
        console.error('解析导入文件失败:', error)
        message.error('文件解析失败，请检查格式')
      }
    }
    reader.readAsText(file, 'UTF-8')
    return false // 阻止自动上传
  }

  // 执行导入
  const handleImport = async () => {
    const validData = importData.filter(item => !item._errors || item._errors.length === 0)
    if (validData.length === 0) {
      message.warning('没有可导入的数据')
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
      message.success(`导入完成：成功 ${successCount} 条${failCount > 0 ? `，失败 ${failCount} 条` : ''}${ignoredCount > 0 ? `，已跳过 ${ignoredCount} 条无效数据` : ''}`)
      setImportModalOpen(false)
      setImportData([])
      fetchHotels()
    } else {
      message.error('导入失败，请检查数据格式')
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
      message.warning('请两次输入正确的酒店名称以确认删除')
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
      message.success('已提交删除申请，等待管理员审核')
      closeDeleteModal()
      fetchHotels()
    } catch (error) {
      console.error('提交删除申请失败:', error)
      message.error('提交删除申请失败，请重试')
    } finally {
      setDeleting(false)
    }
  }

  const exportHotels = () => {
    if (filteredHotels.length === 0) {
      message.warning('暂无可导出的酒店数据')
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
    a.download = '酒店导出.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const columns = [
    { title: '酒店名称', dataIndex: 'name', width: 180, ellipsis: true },
    { title: '英文名', dataIndex: 'name_en', width: 220, ellipsis: true },
    { title: '城市', dataIndex: 'city', width: 80 },
    { title: '星级', dataIndex: 'star_rating', width: 60 },
    { title: '最低价', dataIndex: 'lowestPrice', width: 80, render: (v) => v ? `¥${v}` : '-' },
    { title: '开业时间', dataIndex: 'opening_time', width: 100 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (value) => {
        const info = statusMap[value] || { color: 'default', label: value }
        return <Tag color={info.color}>{info.label}</Tag>
      }
    },
    {
      title: '操作',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {record.status === 'approved' && (
            <>
              <GlassButton type="link" size="small" onClick={() => navigate(`/hotels/${record.id}`)}>查看</GlassButton>
              <Popconfirm
                title="确定下线该酒店吗？"
                description="下线后酒店将不再对外展示，需联系管理员恢复"
                onConfirm={() => handleUpdateStatus(record.id, 'offline')}
                okText="确定"
                cancelText="取消"
              >
                <GlassButton type="link" size="small" danger icon={<StopOutlined />}>下线</GlassButton>
              </Popconfirm>
            </>
          )}
          {record.status === 'offline' && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              已下线（重新提交审核上线）
            </Typography.Text>
          )}
          <GlassButton type="link" size="small" onClick={() => navigate(`/hotels/edit/${record.id}`)}>编辑</GlassButton>
          <GlassButton type="link" size="small" danger onClick={() => openDeleteModal(record)}>删除</GlassButton>
        </Space>
      )
    }
  ]

  // 预览表格列
  const previewColumns = [
    { title: '酒店名称', dataIndex: 'name', ellipsis: true },
    { title: '城市', dataIndex: 'city', width: 80 },
    { title: '地址', dataIndex: 'address', ellipsis: true },
    { title: '星级', dataIndex: 'star_rating', width: 60 },
    { title: '设施', dataIndex: 'facilities', render: (v) => v?.join('、') || '-', ellipsis: true },
    { title: '校验结果', dataIndex: '_errors', render: (v) => v?.length ? v.join('；') : '通过', width: 200 }
  ]

  return (
    <Card
      title={<Typography.Title level={5} style={{ margin: 0 }}>酒店管理</Typography.Title>}
      extra={
        <Space>
          <GlassButton icon={<UploadOutlined />} onClick={() => setImportModalOpen(true)}>批量导入</GlassButton>
          <GlassButton icon={<DownloadOutlined />} onClick={exportHotels}>批量导出</GlassButton>
          <GlassButton type="primary" onClick={() => navigate('/hotels/new')}>新增酒店</GlassButton>
        </Space>
      }
    >
      {/* 搜索筛选区 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Input
            placeholder="搜索酒店名称"
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
              { value: 'all', label: '全部状态' },
              { value: 'pending', label: '待审核' },
              { value: 'approved', label: '已上架' },
              { value: 'rejected', label: '已驳回' },
              { value: 'offline', label: '已下线' },
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
            共 {filteredHotels.length} 家酒店
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
        title="批量导入酒店"
        open={importModalOpen}
        onCancel={() => {
          setImportModalOpen(false)
          setImportData([])
        }}
        width={800}
        footer={
          <Space>
            <GlassButton icon={<DownloadOutlined />} onClick={generateTemplate}>
              下载模板
            </GlassButton>
            <GlassButton onClick={() => {
              setImportModalOpen(false)
              setImportData([])
            }}>
              取消
            </GlassButton>
            <GlassButton
              type="primary"
              loading={importing}
              disabled={importData.length === 0 || importData.every(item => item._errors && item._errors.length > 0)}
              onClick={handleImport}
            >
              确认导入 ({importData.length})
            </GlassButton>
          </Space>
        }
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title="导入说明"
          description={
            <div>
              <p style={{ margin: '4px 0' }}>1. 请先下载模板，按照模板格式填写酒店信息</p>
              <p style={{ margin: '4px 0' }}>2. 支持 CSV 格式文件，编码为 UTF-8</p>
              <p style={{ margin: '4px 0' }}>3. 必填字段：酒店名称（中文）、城市、地址</p>
              <p style={{ margin: '4px 0' }}>4. 列表字段可使用 | 或逗号分隔</p>
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
          <p className="ant-upload-text">点击或拖拽 CSV 文件到此区域</p>
          <p className="ant-upload-hint">仅支持 CSV 格式</p>
        </Upload.Dragger>

        {importData.length > 0 && (
          <>
            <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
              预览数据（共 {importData.length} 条）
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
        title="删除酒店"
        open={deleteModalOpen}
        onCancel={closeDeleteModal}
        onOk={handleDeleteRequest}
        okText="提交审核"
        okButtonProps={{ danger: true, disabled: deleting }}
        confirmLoading={deleting}
      >
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          title="删除需管理员审核，审核通过后才会删除"
        />
        <Typography.Text>
          请输入酒店名称以确认删除：
        </Typography.Text>
        <Input
          style={{ marginTop: 8 }}
          placeholder="第一次输入酒店名称"
          value={deleteNameFirst}
          onChange={(e) => setDeleteNameFirst(e.target.value)}
        />
        <Input
          style={{ marginTop: 8 }}
          placeholder="第二次输入酒店名称"
          value={deleteNameSecond}
          onChange={(e) => setDeleteNameSecond(e.target.value)}
        />
        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
          需两次输入完全一致且与酒店名称相同才可提交
        </Typography.Text>
      </Modal>
    </Card>
  )
}
