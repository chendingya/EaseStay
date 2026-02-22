import { DatePicker, Form, InputNumber, Modal, Radio, Space } from 'antd'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassButton } from '../GlassUI'

export default function DiscountModal({ open, selectedRoom, onClose, onSubmit, loading }) {
  const [form] = Form.useForm()
  const { t } = useTranslation()
  const formDiscountType = Form.useWatch('type', form) || 'rate'

  useEffect(() => {
    if (open) {
      form.setFieldsValue({ quantity: 1, discount: 9, type: 'rate', amount: 50, periods: [] })
    }
  }, [open, form])

  const handleClose = () => {
    form.resetFields()
    onClose()
  }

  const handleFinish = (values) => {
    const payload = {
      quantity: values.quantity,
      discount: values.type === 'rate' ? values.discount : -Math.abs(values.amount),
      periods: Array.isArray(values.periods) && values.periods.length === 2
        ? [{ start: values.periods[0].toISOString(), end: values.periods[1].toISOString() }]
        : []
    }
    onSubmit(payload)
  }

  const selectedPrice = Number(selectedRoom?.display_price ?? selectedRoom?.price)

  return (
    <Modal
      title={selectedRoom ? t('hotelDetail.discount.titleWithRoom', { name: selectedRoom.name }) : t('hotelDetail.discount.title')}
      open={open}
      onCancel={handleClose}
      footer={null}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" initialValues={{ quantity: 1, discount: 9, type: 'rate', amount: 50 }} onFinish={handleFinish}>
        <Form.Item name="quantity" label={t('hotelDetail.discount.quantity')} rules={[{ required: true }]}>
          <InputNumber
            min={1}
            style={{ width: 150 }}
            formatter={(value) => (value === undefined || value === null || value === '' ? '' : t('hotelDetail.discount.quantityValue', { value }))}
            parser={(value) => value?.replace(/[^\d]/g, '')}
          />
        </Form.Item>

        <Form.Item name="type" label={t('hotelDetail.discount.type')} rules={[{ required: true }]}>
          <Radio.Group>
            <Radio value="rate">{t('hotelDetail.discount.typeRate')}</Radio>
            <Radio value="amount">{t('hotelDetail.discount.typeAmount')}</Radio>
          </Radio.Group>
        </Form.Item>

        {formDiscountType === 'rate' ? (
          <Form.Item name="discount" label={t('hotelDetail.discount.rate')} rules={[{ required: true }]}>
            <InputNumber
              min={0.1}
              max={10}
              step={0.5}
              style={{ width: 150 }}
              formatter={(value) => (value === undefined || value === null || value === '' ? '' : t('hotelDetail.discount.rateValue', { value }))}
              parser={(value) => value?.replace(/[^\d.]/g, '')}
            />
          </Form.Item>
        ) : (
          <Form.Item
            name="amount"
            label={t('hotelDetail.discount.amount')}
            rules={[
              { required: true },
              {
                validator: (_, value) => {
                  if (Number.isFinite(selectedPrice) && value > selectedPrice) {
                    return Promise.reject(t('hotelDetail.discount.amountTooHigh'))
                  }
                  return Promise.resolve()
                }
              }
            ]}
          >
            <InputNumber
              min={1}
              max={Number.isFinite(selectedPrice) ? selectedPrice : undefined}
              style={{ width: 150 }}
              formatter={(value) => (value === undefined || value === null || value === '' ? '' : t('hotelDetail.discount.amountValue', { value }))}
              parser={(value) => value?.replace(/[^\d]/g, '')}
            />
          </Form.Item>
        )}
        <Form.Item name="periods" label={t('hotelDetail.discount.periods')}>
          <DatePicker.RangePicker showTime style={{ width: 360 }} />
        </Form.Item>

        <Form.Item>
          <Space>
            <GlassButton type="primary" loading={loading} onClick={() => form.submit()}>
              {t('common.confirm')}
            </GlassButton>
            <GlassButton onClick={handleClose}>{t('common.cancel')}</GlassButton>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  )
}
