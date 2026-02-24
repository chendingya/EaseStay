import { Button, Card, Input, Space, Spin, Typography, message } from 'antd'
import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SearchOutlined from '@ant-design/icons/es/icons/SearchOutlined'
import { api } from '../services'
import { useTranslation } from 'react-i18next'
import { useRemoteTableQuery } from '../hooks/useRemoteTableQuery'

const MerchantsTable = lazy(() => import('../components/merchants/MerchantsTable.jsx'))
const ResetPasswordModal = lazy(() => import('../components/merchants/ResetPasswordModal.jsx'))

export default function Merchants() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [merchants, setMerchants] = useState([])
  const [total, setTotal] = useState(0)
  const [resetModal, setResetModal] = useState(null)
  const [resetting, setResetting] = useState(false)
  const [renderTable, setRenderTable] = useState(false)
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

  const handleResetPassword = async ({ newPassword, confirmPassword }) => {
    try {
      if (newPassword !== confirmPassword) {
        message.error(t('merchants.resetPassword.mismatch'))
        return
      }

      setResetting(true)
      await api.post(`/api/user/merchants/${resetModal.id}/reset-password`, { newPassword })
      message.success(t('merchants.resetPassword.success'))
      setResetModal(null)
    } catch (err) {
      if (err?.errorFields) return
      console.error(err)
      message.error(t('merchants.resetPassword.error'))
    } finally {
      setResetting(false)
    }
  }

  useEffect(() => {
    fetchMerchants()
  }, [fetchMerchants])

  useEffect(() => {
    if (renderTable || loading) return

    let canceled = false
    const showTable = () => {
      if (!canceled) setRenderTable(true)
    }

    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(showTable, { timeout: 1200 })
      return () => {
        canceled = true
        if (typeof window.cancelIdleCallback === 'function') {
          window.cancelIdleCallback(idleId)
        }
      }
    }

    const timer = setTimeout(showTable, 180)
    return () => {
      canceled = true
      clearTimeout(timer)
    }
  }, [loading, renderTable])

  const handleRefresh = async () => {
    await fetchMerchants()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>{t('merchants.title')}</Typography.Title>
        <Typography.Text type="secondary">{t('merchants.total', { count: total })}</Typography.Text>
      </div>

      <Card>
        <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <Input
            placeholder={t('merchants.filter.searchPlaceholder')}
            prefix={<SearchOutlined style={{ color: '#bbb' }} />}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            allowClear
            style={{ width: 320, maxWidth: '100%' }}
          />
          <Space>
            <Button onClick={resetKeyword}>{t('merchants.filter.reset')}</Button>
            <Button type="primary" onClick={handleRefresh} loading={loading}>
              {t('common.refresh')}
            </Button>
          </Space>
        </div>

        {renderTable ? (
          <Suspense fallback={<div style={{ minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin /></div>}>
            <MerchantsTable
              merchants={merchants}
              loading={loading}
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={handlePageChange}
              onNavigateDetail={(id) => navigate(`/merchants/${id}`)}
              onOpenResetPassword={setResetModal}
            />
          </Suspense>
        ) : (
          <div style={{ minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spin />
          </div>
        )}
      </Card>

      {resetModal ? (
        <Suspense fallback={null}>
          <ResetPasswordModal
            record={resetModal}
            resetting={resetting}
            onCancel={() => setResetModal(null)}
            onSubmit={handleResetPassword}
          />
        </Suspense>
      ) : null}
    </div>
  )
}
