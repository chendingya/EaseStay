import { Form, Input, Modal, Space } from 'antd'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassButton } from '../GlassButton'

export default function ResetPasswordModal({ record, resetting, onCancel, onSubmit }) {
  const { t } = useTranslation()
  const [form] = Form.useForm()

  useEffect(() => {
    form.resetFields()
  }, [form, record])

  const handleSubmit = async () => {
    const values = await form.validateFields()
    await onSubmit(values)
  }

  return (
    <Modal
      title={t('merchants.resetPassword.title', { username: record?.username })}
      open={!!record}
      onCancel={onCancel}
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
            <GlassButton onClick={onCancel}>{t('common.cancel')}</GlassButton>
            <GlassButton type="primary" loading={resetting} onClick={handleSubmit}>
              {t('merchants.resetPassword.confirmAction')}
            </GlassButton>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  )
}
