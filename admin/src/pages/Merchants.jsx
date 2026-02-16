import { Card, Table, Space, Typography, Tag, Modal, Form, Input } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserOutlined, ShopOutlined, EyeOutlined, KeyOutlined } from '@ant-design/icons'
import { GlassButton, TableFilterBar, glassMessage as message } from '../components'
import { api } from '../services'
import { useTranslation } from 'react-i18next'
import { useRemoteTableQuery } from '../hooks/useRemoteTableQuery'

export default function Merchants() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [merchants, setMerchants] = useState([])
  const [total, setTotal] = useState(0)
  const [resetModal, setResetModal] = useState(null)
  const [form] = Form.useForm()
  const [resetting, setResetting] = useState(false)
  const {
    searchInput,
    setSearchInput,
    keyword,
    page,
    pageSize,
    handlePageChange,
    resetKeyword
  } = useRemoteTableQuery({
    initialPageSize: 10
  })

  const fetchMerchants = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', String(page))
      params.append('pageSize', String(pageSize))
      if (keyword) params.append('keyword', keyword)

      const data = await api.get(`/api/user/merchants?${params.toString()}`)
      const list = Array.isArray(data?.list) ? data.list : (Array.isArray(data) ? data : [])
      const nextTotal = Array.isArray(data?.list)
        ? (Number(data?.total) || 0)
        : list.length
      setMerchants(list)
      setTotal(nextTotal)
    } catch (error) {
      console.error(error)
      message.error(t('merchants.fetchError'))
    } finally {
      setLoading(false)
    }
  }, [keyword, page, pageSize, t])

  const handleResetPassword = async () => {
    try {
      const values = await form.validateFields()
      if (values.newPassword !== values.confirmPassword) {
        message.error(t('merchants.resetPassword.mismatch'))
        return
      }

      setResetting(true)
      await api.post(`/api/user/merchants/${resetModal.id}/reset-password`, { newPassword: values.newPassword })
      message.success(t('merchants.resetPassword.success'))
      setResetModal(null)
      form.resetFields()
    } catch (err) {
      if (err.errorFields) return
      console.error(err)
      message.error(t('merchants.resetPassword.error'))
    } finally {
      setResetting(false)
    }
  }

  useEffect(() => {
    fetchMerchants()
  }, [fetchMerchants])

  const handleRefresh = async () => {
    await fetchMerchants()
  }

  const columns = [
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
      render: (v) => v ? new Date(v).toLocaleDateString('zh-CN') : '-'
    },
    {
      title: t('merchants.columns.action'),
      render: (_, record) => (
        <Space>
          <GlassButton
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/merchants/${record.id}`)}
          >
            {t('common.view')}
          </GlassButton>
          <GlassButton
            type="link"
            icon={<KeyOutlined />}
            onClick={() => {
              setResetModal(record)
              form.resetFields()
            }}
          >
            {t('merchants.actions.resetPassword')}
          </GlassButton>
        </Space>
      )
    }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>{t('merchants.title')}</Typography.Title>
        <Typography.Text type="secondary">{t('merchants.total', { count: total })}</Typography.Text>
      </div>

      <Card>
        <TableFilterBar
          searchPlaceholder={t('merchants.filter.searchPlaceholder')}
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          onReset={resetKeyword}
          onRefresh={handleRefresh}
          refreshLoading={loading}
          resetText={t('merchants.filter.reset')}
          refreshText={t('common.refresh')}
        />
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
            onChange: handlePageChange
          }}
        />
      </Card>

      {/* 重置密码弹窗 */}
      <Modal
        title={t('merchants.resetPassword.title', { username: resetModal?.username })}
        open={!!resetModal}
        onCancel={() => {
          setResetModal(null)
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
                setResetModal(null)
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
