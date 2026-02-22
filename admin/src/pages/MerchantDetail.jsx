import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Tag, Space, Typography, Table, Spin, Row, Col, Statistic, Modal, Form, Input } from 'antd'
import UserOutlined from '@ant-design/icons/es/icons/UserOutlined'
import ShopOutlined from '@ant-design/icons/es/icons/ShopOutlined'
import CalendarOutlined from '@ant-design/icons/es/icons/CalendarOutlined'
import KeyOutlined from '@ant-design/icons/es/icons/KeyOutlined'
import StarFilled from '@ant-design/icons/es/icons/StarFilled'
import EnvironmentOutlined from '@ant-design/icons/es/icons/EnvironmentOutlined'
import { GlassButton, glassMessage as message } from '../components'
import { api } from '../services'
import { useTranslation } from 'react-i18next'

export default function MerchantDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [merchant, setMerchant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [resetModal, setResetModal] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [form] = Form.useForm()

  const fetchMerchant = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get(`/api/user/merchants/${id}`)
      setMerchant(data)
    } catch (error) {
      if (error?.response?.status) {
        navigate('/merchants')
      }
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => {
    fetchMerchant()
  }, [fetchMerchant])

  const handleResetPassword = async () => {
    try {
      const values = await form.validateFields()
      if (values.newPassword !== values.confirmPassword) {
        message.error(t('merchants.resetPassword.mismatch'))
        return
      }

      setResetting(true)
      await api.post(`/api/user/merchants/${id}/reset-password`, { newPassword: values.newPassword })
      message.success(t('merchants.resetPassword.success'))
      setResetModal(false)
      form.resetFields()
    } catch (err) {
      if (err.errorFields) return
    } finally {
      setResetting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!merchant) {
    return null
  }

  // 统计数据
  const hotels = merchant.hotels || []
  const stats = {
    total: hotels.length,
    approved: hotels.filter(h => h.status === 'approved').length,
    pending: hotels.filter(h => h.status === 'pending').length,
    offline: hotels.filter(h => h.status === 'offline').length
  }

  const statusMap = {
    pending: { color: 'orange', label: t('status.pending') },
    approved: { color: 'green', label: t('status.approved') },
    rejected: { color: 'red', label: t('status.rejected') },
    offline: { color: 'default', label: t('status.offline') }
  }

  const hotelColumns = [
    { 
      title: t('merchantDetail.columns.hotelName'), 
      dataIndex: 'name', 
      ellipsis: true,
      render: (text, record) => (
        <a onClick={() => navigate(`/admin-hotels/${record.id}`)}>{text}</a>
      )
    },
    { 
      title: t('merchantDetail.columns.city'), 
      dataIndex: 'city', 
      width: 100,
      render: (v) => v ? <><EnvironmentOutlined /> {v}</> : '-'
    },
    { 
      title: t('merchantDetail.columns.star'), 
      dataIndex: 'star_rating', 
      width: 80,
      render: v => v ? <span><StarFilled style={{ color: '#faad14' }} /> {t('merchantDetail.starValue', { value: v })}</span> : '-'
    },
    {
      title: t('merchantDetail.columns.status'),
      dataIndex: 'status',
      width: 90,
      render: (value) => {
        const info = statusMap[value] || { color: 'default', label: value }
        return <Tag color={info.color}>{info.label}</Tag>
      }
    },
    {
      title: t('merchantDetail.columns.action'),
      width: 100,
      render: (_, record) => (
        <GlassButton type="link" size="small" onClick={() => navigate(`/admin-hotels/${record.id}`)}>
          {t('common.viewDetail')}
        </GlassButton>
      )
    }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 24 }}>
      {/* 页面标题 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            <UserOutlined /> {merchant.username}
          </Typography.Title>
          <Typography.Text type="secondary">{t('merchantDetail.subtitle')}</Typography.Text>
        </div>
        <Space>
          <GlassButton onClick={() => navigate('/merchants')}>{t('common.backToList')}</GlassButton>
          <GlassButton icon={<KeyOutlined />} onClick={() => setResetModal(true)}>
            {t('merchants.actions.resetPassword')}
          </GlassButton>
        </Space>
      </div>

      {/* 酒店统计 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic title={t('merchantDetail.stats.total')} value={stats.total} prefix={<ShopOutlined />} suffix={t('merchantDetail.stats.suffix')} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title={t('merchantDetail.stats.approved')} value={stats.approved} styles={{ content: { color: '#52c41a' } }} suffix={t('merchantDetail.stats.suffix')} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title={t('merchantDetail.stats.pending')} value={stats.pending} styles={{ content: { color: '#faad14' } }} suffix={t('merchantDetail.stats.suffix')} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title={t('merchantDetail.stats.offline')} value={stats.offline} styles={{ content: { color: '#999' } }} suffix={t('merchantDetail.stats.suffix')} />
          </Card>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col span={8}>
          {/* 基本信息 */}
          <Card title={t('merchantDetail.sections.basic')}>
            <Descriptions column={1}>
              <Descriptions.Item label={<><UserOutlined /> {t('merchantDetail.basic.username')}</>}>
                {merchant.username}
              </Descriptions.Item>
              <Descriptions.Item label={<><CalendarOutlined /> {t('merchantDetail.basic.createdAt')}</>}>
                {merchant.created_at ? new Date(merchant.created_at).toLocaleDateString('zh-CN') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('merchantDetail.basic.id')}>
                {merchant.id}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col span={16}>
          {/* 酒店列表 */}
          <Card title={t('merchantDetail.sections.hotels', { count: hotels.length })}>
            <Table
              columns={hotelColumns}
              dataSource={hotels}
              rowKey="id"
              pagination={{ pageSize: 5, showSizeChanger: false }}
              locale={{ emptyText: t('merchantDetail.emptyHotels') }}
            />
          </Card>
        </Col>
      </Row>

      {/* 重置密码弹窗 */}
      <Modal
        title={t('merchants.resetPassword.title', { username: merchant.username })}
        open={resetModal}
        onCancel={() => {
          setResetModal(false)
          form.resetFields()
        }}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="newPassword"
            label={t('merchants.resetPassword.new')}
            rules={[
              { required: true, message: t('merchants.resetPassword.newRequired') },
              { min: 6, message: t('merchants.resetPassword.minLength') }
            ]}
          >
            <Input.Password placeholder={t('merchants.resetPassword.newPlaceholder')} />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label={t('merchants.resetPassword.confirm')}
            rules={[
              { required: true, message: t('merchants.resetPassword.confirmRequired') },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error(t('merchants.resetPassword.mismatch')))
                }
              })
            ]}
          >
            <Input.Password placeholder={t('merchants.resetPassword.confirmPlaceholder')} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <GlassButton onClick={() => {
                setResetModal(false)
                form.resetFields()
              }}>{t('common.cancel')}</GlassButton>
              <GlassButton type="primary" loading={resetting} onClick={handleResetPassword}>
                {t('merchants.resetPassword.confirmAction')}
              </GlassButton>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
