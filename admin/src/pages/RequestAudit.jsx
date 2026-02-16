import { Card, Table, Typography, Tag, Modal, Form, Input, Tabs, Descriptions, Empty, Alert, Space } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { 
  CheckCircleOutlined, CloseCircleOutlined, ShopOutlined, 
  AppstoreOutlined, HomeOutlined, GiftOutlined, ArrowLeftOutlined, DeleteOutlined
} from '@ant-design/icons'
import { GlassButton, glassMessage as message } from '../components'
import { api } from '../services'
import { useTranslation } from 'react-i18next'

export default function RequestAudit() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const hotelIdFilter = searchParams.get('hotelId')
  
  const [loading, setLoading] = useState(false)
  const [requests, setRequests] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [rejecting, setRejecting] = useState(null)
  const [rejectForm] = Form.useForm()
  const [detailModal, setDetailModal] = useState(null)

  const fetchRequests = useCallback(async (type) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (type && type !== 'all') params.append('type', type)
      if (hotelIdFilter) params.append('hotelId', hotelIdFilter)
      params.append('page', String(page))
      params.append('pageSize', String(pageSize))
      const query = params.toString() ? `?${params.toString()}` : ''
      const data = await api.get(`/api/admin/requests${query}`)
      const list = Array.isArray(data?.list) ? data.list : (Array.isArray(data) ? data : [])
      const nextTotal = Array.isArray(data?.list)
        ? (Number(data?.total) || 0)
        : list.length
      setRequests(list)
      setTotal(nextTotal)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [hotelIdFilter, page, pageSize])

  useEffect(() => {
    fetchRequests(activeTab)
  }, [activeTab, fetchRequests])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setPage(1)
  }

  const handlePageChange = (nextPage, nextPageSize) => {
    const normalizedPage = Math.max(Number(nextPage) || 1, 1)
    const normalizedPageSize = Math.max(Number(nextPageSize) || 10, 1)
    if (normalizedPageSize !== pageSize) {
      setPageSize(normalizedPageSize)
      setPage(1)
      return
    }
    setPage(normalizedPage)
  }

  const handleReview = async (id, action, rejectReason) => {
    setLoading(true)
    try {
      await api.put(`/api/admin/requests/${id}/review`, { action, rejectReason })
      message.success(action === 'approve' ? t('requestAudit.successApprove') : t('requestAudit.successReject'))
      window.dispatchEvent(new Event('admin-pending-update'))
      setRejecting(null)
      rejectForm.resetFields()
      fetchRequests(activeTab)
    } catch (error) {
      console.error(error)
      message.error(t('requestAudit.errorReview'))
    } finally {
      setLoading(false)
    }
  }

  const handleReject = () => {
    rejectForm.validateFields().then(values => {
      handleReview(rejecting.id, 'reject', values.reason)
    })
  }

  const renderDataDetail = (record) => {
    if (!record) return null
    const { type, name, data } = record

    if (type === 'facility') {
      return (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label={t('requestAudit.detail.facilityName')}>{name}</Descriptions.Item>
          <Descriptions.Item label={t('requestAudit.detail.description')}>{data?.description || t('common.none')}</Descriptions.Item>
        </Descriptions>
      )
    }

    if (type === 'room_type') {
      return (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label={t('requestAudit.detail.roomName')}>{name}</Descriptions.Item>
          <Descriptions.Item label={t('requestAudit.detail.price')}>{t('requestAudit.detail.priceValue', { value: data?.price || 0 })}</Descriptions.Item>
          <Descriptions.Item label={t('requestAudit.detail.stock')}>{t('requestAudit.detail.stockValue', { value: data?.stock || 0 })}</Descriptions.Item>
        </Descriptions>
      )
    }

    if (type === 'promotion') {
      return (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label={t('requestAudit.detail.promoTitle')}>{name}</Descriptions.Item>
          <Descriptions.Item label={t('requestAudit.detail.promoType')}>{data?.type || t('requestAudit.detail.promoDefault')}</Descriptions.Item>
          <Descriptions.Item label={t('requestAudit.detail.discount')}>{data?.value ? t('requestAudit.detail.discountRate', { value: data.value }) : t('common.none')}</Descriptions.Item>
        </Descriptions>
      )
    }
    if (type === 'hotel_delete') {
      return (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label={t('requestAudit.detail.hotelName')}>{name || data?.hotelName || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('requestAudit.detail.noteLabel')}>{t('requestAudit.detail.deleteNote')}</Descriptions.Item>
        </Descriptions>
      )
    }

    return null
  }

  const typeMap = {
    facility: { label: t('requestAudit.type.facility'), icon: <AppstoreOutlined />, color: 'blue' },
    room_type: { label: t('requestAudit.type.roomType'), icon: <HomeOutlined />, color: 'purple' },
    promotion: { label: t('requestAudit.type.promotion'), icon: <GiftOutlined />, color: 'orange' },
    hotel_delete: { label: t('requestAudit.type.hotelDelete'), icon: <DeleteOutlined />, color: 'red' }
  }

  const statusMap = {
    pending: { color: 'orange', label: t('status.pending') },
    approved: { color: 'green', label: t('requestAudit.status.approved') },
    rejected: { color: 'red', label: t('requestAudit.status.rejected') }
  }

  const columns = [
    {
      title: t('requestAudit.columns.type'),
      dataIndex: 'type',
      width: 120,
      render: (type) => {
        const info = typeMap[type] || { label: type, color: 'default' }
        return <Tag icon={info.icon} color={info.color}>{info.label}</Tag>
      }
    },
    { 
      title: t('requestAudit.columns.name'), 
      dataIndex: 'name',
      render: (text, record) => (
        <a onClick={() => setDetailModal(record)}>{text}</a>
      )
    },
    { 
      title: t('requestAudit.columns.hotel'), 
      dataIndex: 'hotels',
      render: (hotel) => hotel?.name || '-'
    },
    { 
      title: t('requestAudit.columns.merchant'), 
      dataIndex: 'users',
      render: (user) => user?.username || '-'
    },
    { 
      title: t('requestAudit.columns.createdAt'), 
      dataIndex: 'created_at', 
      width: 120,
      render: v => v ? v.split('T')[0] : '-' 
    },
    {
      title: t('requestAudit.columns.status'),
      dataIndex: 'status',
      width: 100,
      render: (value) => {
        const info = statusMap[value] || { color: 'default', label: value }
        return <Tag color={info.color}>{info.label}</Tag>
      }
    },
    {
      title: t('requestAudit.columns.action'),
      width: 200,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 8 }}>
          {record.status === 'pending' && (
            <>
              <GlassButton 
                type="primary" 
                size="small" 
                icon={<CheckCircleOutlined />}
                onClick={() => handleReview(record.id, 'approve')}
              >
                {t('common.approve')}
              </GlassButton>
              <GlassButton 
                danger 
                size="small" 
                icon={<CloseCircleOutlined />}
                onClick={() => setRejecting(record)}
              >
                {t('common.reject')}
              </GlassButton>
            </>
          )}
          <GlassButton type="link" size="small" onClick={() => setDetailModal(record)}>
            {t('common.detail')}
          </GlassButton>
        </div>
      )
    }
  ]

  const tabItems = [
    { key: 'all', label: t('requestAudit.tabs.all') },
    { key: 'facility', label: t('requestAudit.tabs.facility') },
    { key: 'room_type', label: t('requestAudit.tabs.roomType') },
    { key: 'promotion', label: t('requestAudit.tabs.promotion') },
    { key: 'hotel_delete', label: t('requestAudit.tabs.hotelDelete') }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 24 }}>
      <Space>
        {hotelIdFilter && (
          <GlassButton icon={<ArrowLeftOutlined />} onClick={() => navigate(`/audit/${hotelIdFilter}`)}>
            {t('requestAudit.backToHotelAudit')}
          </GlassButton>
        )}
        <Typography.Title level={4} style={{ margin: 0 }}>
          <ShopOutlined /> {t('requestAudit.title')}
        </Typography.Title>
      </Space>

      {hotelIdFilter && (
        <Alert
          type="info"
          showIcon
          title={
            <Space>
              <span>{t('requestAudit.hotelFilterTip')}</span>
              <GlassButton size="small" onClick={() => setSearchParams({})}>
                {t('requestAudit.viewAll')}
              </GlassButton>
            </Space>
          }
        />
      )}

      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={handleTabChange}
          items={tabItems}
          style={{ marginBottom: 16 }}
        />
        <Table
          columns={columns}
          dataSource={requests}
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
          locale={{ emptyText: <Empty description={t('requestAudit.empty')} /> }}
        />
      </Card>

      {/* 拒绝原因弹窗 */}
      <Modal
        title={t('requestAudit.rejectModal.title')}
        open={!!rejecting}
        onOk={handleReject}
        onCancel={() => { setRejecting(null); rejectForm.resetFields() }}
        okText={t('requestAudit.rejectModal.confirm')}
        okButtonProps={{ danger: true }}
      >
        <p>{t('requestAudit.rejectModal.content', { name: rejecting?.name })}</p>
        <Form form={rejectForm} layout="vertical">
          <Form.Item
            name="reason"
            label={t('requestAudit.rejectModal.reason')}
            rules={[{ required: true, message: t('requestAudit.rejectModal.reasonRequired') }]}
          >
            <Input.TextArea rows={3} placeholder={t('requestAudit.rejectModal.reasonPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title={
          <span>
            {typeMap[detailModal?.type]?.icon} {typeMap[detailModal?.type]?.label || t('requestAudit.type.default')} - {detailModal?.name}
          </span>
        }
        open={!!detailModal}
        onCancel={() => setDetailModal(null)}
        footer={
          detailModal?.status === 'pending' ? (
            <Space>
              <GlassButton danger onClick={() => { setDetailModal(null); setRejecting(detailModal) }}>
                {t('common.reject')}
              </GlassButton>
              <GlassButton type="primary" onClick={() => { handleReview(detailModal.id, 'approve'); setDetailModal(null) }}>
                {t('common.approve')}
              </GlassButton>
            </Space>
          ) : (
            <GlassButton onClick={() => setDetailModal(null)}>{t('common.close')}</GlassButton>
          )
        }
        width={500}
      >
        {detailModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label={t('requestAudit.detail.merchant')}>{detailModal.users?.username || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('requestAudit.detail.hotel')}>{detailModal.hotels?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('requestAudit.detail.createdAt')}>
                {detailModal.created_at ? new Date(detailModal.created_at).toLocaleString() : '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('requestAudit.detail.status')}>
                <Tag color={statusMap[detailModal.status]?.color}>
                  {statusMap[detailModal.status]?.label}
                </Tag>
              </Descriptions.Item>
              {detailModal.status === 'rejected' && detailModal.reject_reason && (
                <Descriptions.Item label={t('requestAudit.rejectModal.reason')}>
                  <span style={{ color: '#f5222d' }}>{detailModal.reject_reason}</span>
                </Descriptions.Item>
              )}
            </Descriptions>

            <Card size="small" title={t('requestAudit.detail.content')}>
              {renderDataDetail(detailModal)}
            </Card>

            {detailModal.status === 'pending' && (
              <div style={{ 
                padding: 12, 
                background: '#fffbe6', 
                borderRadius: 8, 
                border: '1px solid #ffe58f' 
              }}>
                <Typography.Text type="warning">
                  {t('requestAudit.pendingTip')}
                </Typography.Text>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
