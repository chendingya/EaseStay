import { Card, Form, Input, Space, Typography, Descriptions, Divider, Modal } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { UserOutlined, LockOutlined, CalendarOutlined } from '@ant-design/icons'
import { GlassButton, glassMessage as message } from '../components'
import { api } from '../services'
import { useTranslation } from 'react-i18next'

export default function Account() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [passwordModal, setPasswordModal] = useState(false)
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const fetchUser = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get('/api/user/me')
      setUser(data)
    } catch (error) {
      console.error('获取用户信息失败:', error)
      message.error(t('account.fetchError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const handleChangePassword = async () => {
    try {
      const values = await form.validateFields()
      if (values.newPassword !== values.confirmPassword) {
        message.error(t('account.passwordMismatch'))
        return
      }

      setSaving(true)
      await api.post('/api/user/change-password', {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword
      })
      message.success(t('account.passwordSuccess'))
      setPasswordModal(false)
      form.resetFields()
    } catch (err) {
      if (err.errorFields) return
      console.error('修改密码失败:', err)
      message.error(t('account.passwordError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 24 }}>
      <Typography.Title level={4} style={{ margin: 0 }}>{t('account.title')}</Typography.Title>

      <Card title={t('account.basicInfo')} loading={loading}>
        {user && (
          <Descriptions column={1} styles={{ label: { width: 120 } }}>
            <Descriptions.Item label={<><UserOutlined /> {t('account.username')}</>}>
              {user.username}
            </Descriptions.Item>
            <Descriptions.Item label={t('account.role')}>
              {user.role === 'admin' ? t('role.admin') : t('role.merchant')}
            </Descriptions.Item>
            <Descriptions.Item label={<><CalendarOutlined /> {t('account.registeredAt')}</>}>
              {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      <Card title={t('account.security')}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Typography.Text strong><LockOutlined /> {t('account.loginPassword')}</Typography.Text>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 4 }}>
              {t('account.passwordHint')}
            </Typography.Paragraph>
          </div>
          <GlassButton onClick={() => setPasswordModal(true)}>{t('account.changePassword')}</GlassButton>
        </div>
      </Card>

      <Modal
        title={t('account.changePassword')}
        open={passwordModal}
        onCancel={() => {
          setPasswordModal(false)
          form.resetFields()
        }}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="oldPassword"
            label={t('account.oldPassword')}
            rules={[{ required: true, message: t('account.oldPasswordRequired') }]}
          >
            <Input.Password placeholder={t('account.oldPasswordPlaceholder')} />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label={t('account.newPassword')}
            rules={[
              { required: true, message: t('account.newPasswordRequired') },
              { min: 6, message: t('account.passwordMin') }
            ]}
          >
            <Input.Password placeholder={t('account.newPasswordPlaceholder')} />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label={t('account.confirmPassword')}
            rules={[
              { required: true, message: t('account.confirmPasswordRequired') },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error(t('account.passwordMismatch')))
                }
              })
            ]}
          >
            <Input.Password placeholder={t('account.confirmPasswordPlaceholder')} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <GlassButton onClick={() => {
                setPasswordModal(false)
                form.resetFields()
              }}>{t('common.cancel')}</GlassButton>
              <GlassButton type="primary" loading={saving} onClick={handleChangePassword}>
                {t('account.confirmChange')}
              </GlassButton>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
