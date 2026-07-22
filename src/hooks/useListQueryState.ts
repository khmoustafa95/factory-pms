import { useEffect, useState } from 'react'
import { DEFAULT_PAGE_SIZE } from '@/lib/list-query'

export function useListQueryState<T extends Record<string, string>>(
  initialFilters: T,
) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearchState] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filters, setFilters] = useState(initialFilters)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)

    return () => {
      window.clearTimeout(timer)
    }
  }, [search])

  const setSearch = (value: string) => {
    setSearchState(value)
  }

  const setFilter = <K extends keyof T>(key: K, value: T[K]) => {
    setPage(1)
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const handlePageSizeChange = (nextPageSize: number) => {
    setPageSize(nextPageSize)
    setPage(1)
  }

  const clearAll = () => {
    setSearchState('')
    setDebouncedSearch('')
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
