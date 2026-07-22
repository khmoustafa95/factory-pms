import type { ReactNode } from 'react'
import { AdaptiveList } from '@/components/AdaptiveList'
import { ListPagination } from '@/components/ListPagination'
import { QueryState } from '@/components/QueryState'

type PaginatedListQueryState = {
  isLoading: boolean
  error: unknown
  loadingMessage: string
  errorMessage: string
  onRetry: () => void
  isRetrying?: boolean
}

type PaginatedListPageProps<T> = {
  header: ReactNode
  toolbar: ReactNode
  items: T[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  emptyMessage: string
  getKey: (item: T) => string
  renderMobileCard: (item: T) => ReactNode
  children: ReactNode
  query: PaginatedListQueryState
  footer?: ReactNode
}

export function PaginatedListPage<T>({
  header,
  toolbar,
  items,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  emptyMessage,
  getKey,
  renderMobileCard,
  children,
  query,
  footer,
}: PaginatedListPageProps<T>) {
  return (
    <section className="space-y-6">
      {header}
      {toolbar}

      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        loadingMessage={query.loadingMessage}
        errorMessage={query.errorMessage}
        onRetry={query.onRetry}
        isRetrying={query.isRetrying}
      >
        <AdaptiveList
          items={items}
          emptyMessage={emptyMessage}
          getKey={getKey}
          renderMobileCard={renderMobileCard}
        >
          {children}
        </AdaptiveList>

        <ListPagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </QueryState>

      {footer}
    </section>
  )
}
