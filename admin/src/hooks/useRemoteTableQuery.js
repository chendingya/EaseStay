import { useEffect, useState } from 'react'

export const useRemoteTableQuery = ({
  initialPage = 1,
  initialPageSize = 10,
  initialSearch = '',
  debounceMs = 350
} = {}) => {
  const [searchInput, setSearchInput] = useState(initialSearch)
  const [keyword, setKeyword] = useState(String(initialSearch || '').trim())
  const [page, setPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      const normalized = String(searchInput || '').trim()
      setPage(1)
      setKeyword(normalized)
    }, debounceMs)
    return () => clearTimeout(timer)
  }, [debounceMs, searchInput])

  const handlePageChange = (nextPage, nextPageSize) => {
    const normalizedPage = Math.max(Number(nextPage) || 1, 1)
    const normalizedSize = Math.max(Number(nextPageSize) || initialPageSize, 1)
    if (normalizedSize !== pageSize) {
      setPageSize(normalizedSize)
      setPage(1)
      return
    }
    setPage(normalizedPage)
  }

  const resetKeyword = () => {
    setSearchInput('')
    setKeyword('')
    setPage(1)
  }

  return {
    searchInput,
    setSearchInput,
    keyword,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    setTotal,
    handlePageChange,
    resetKeyword
  }
}

export default useRemoteTableQuery
