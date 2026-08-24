import { useEffect, useRef, useState } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { DEFAULT_PAGE_SIZE } from '@/lib/list-query'

export function useListQueryState<T extends Record<string, string>>(
  initialFilters: T,
) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [filters, setFilters] = useState(initialFilters)
  const skipPageReset = useRef(true)

  useEffect(() => {
    if (skipPageReset.current) {
      skipPageReset.current = false
      return
    }

    setPage(1)
  }, [debouncedSearch])

  const setFilter = <K extends keyof T>(key: K, value: T[K]) => {
    setPage(1)
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const handlePageSizeChange = (nextPageSize: number) => {
    setPageSize(nextPageSize)
    setPage(1)
  }

  const clearAll = () => {
    skipPageReset.current = true
    setSearch('')
    setFilters(initialFilters)
    setPage(1)
  }

  const hasActiveFilters =
    search.trim().length > 0 ||
    Object.entries(filters).some(([, value]) => value !== 'all')

  return {
    page,
    setPage,
    pageSize,
    setPageSize: handlePageSizeChange,
    search,
    setSearch,
    debouncedSearch,
    filters,
    setFilter,
    clearAll,
    hasActiveFilters,
  }
}
