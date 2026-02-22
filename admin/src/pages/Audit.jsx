import { Card, Spin, Typography } from 'antd'
import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TableFilterBar } from '../components'
import { api } from '../services'
import { useTranslation } from 'react-i18next'
import { useRemoteTableQuery } from '../hooks/useRemoteTableQuery'

const AuditTable = lazy(() => import('../components/audit/AuditTable.jsx'))

export default function Audit() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [hotels, setHotels] = useState([])
  const [statusFilter, setStatusFilter] = useState('pending')
  const [renderTable, setRenderTable] = useState(false)
  const {
    page,
    pageSize,
    total,
    setTotal,
    setPage,
    handlePageChange
  } = useRemoteTableQuery({
    initialPageSize: 8
  })

  const fetchHotels = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', String(page))
      params.append('pageSize', String(pageSize))
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)
      const data = await api.get(`/api/admin/hotels?${params.toString()}`)
      const list = Array.isArray(data?.list) ? data.list : (Array.isArray(data) ? data : [])
      const nextTotal = Array.isArray(data?.list)
        ? (Number(data?.total) || 0)
        : list.length
      setHotels(list)
      setTotal(nextTotal)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, setTotal, statusFilter])

  useEffect(() => {
    fetchHotels()
  }, [fetchHotels])

  useEffect(() => {
    let canceled = false
    const showTable = () => {
      if (!canceled) setRenderTable(true)
    }
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(showTable, { timeout: 1000 })
      return () => {
        canceled = true
        if (typeof window.cancelIdleCallback === 'function') {
          window.cancelIdleCallback(idleId)
        }
      }
    }
    const timer = setTimeout(showTable, 200)
    return () => {
      canceled = true
      clearTimeout(timer)
    }
  }, [])

  const handleStatusChange = (value) => {
    setStatusFilter(value)
    setPage(1)
  }

  const handleRefresh = async () => {
    await fetchHotels()
  }

  return (
    <Card
      title={<Typography.Title level={5} style={{ margin: 0 }}>{t('audit.title')}</Typography.Title>}
    >
      <TableFilterBar
        filterItems={[
          {
            key: 'status',
            span: 5,
            value: statusFilter,
            onChange: handleStatusChange,
            options: [
              { value: 'all', label: t('audit.filter.all') },
              { value: 'pending', label: t('status.pending') },
              { value: 'approved', label: t('status.approved') },
              { value: 'rejected', label: t('status.rejected') },
              { value: 'offline', label: t('status.offline') }
            ]
          }
        ]}
        onRefresh={handleRefresh}
        refreshLoading={loading}
        refreshText={t('common.refresh')}
      />

      {renderTable ? (
        <Suspense fallback={<div style={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin /></div>}>
          <AuditTable
            hotels={hotels}
            loading={loading}
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={handlePageChange}
            onNavigateDetail={(id) => navigate(`/audit/${id}`)}
          />
        </Suspense>
      ) : (
        <div style={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spin />
        </div>
      )}
    </Card>
  )
}
