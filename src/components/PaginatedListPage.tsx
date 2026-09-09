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
    <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="shrink-0">{header}</div>
      <div className="shrink-0">{toolbar}</div>

      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        loadingMessage={query.loadingMessage}
        errorMessage={query.errorMessage}
        onRetry={query.onRetry}
        isRetrying={query.isRetrying}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <AdaptiveList
          items={items}
          emptyMessage={emptyMessage}
          getKey={getKey}
          renderMobileCard={renderMobileCard}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {children}
        </AdaptiveList>

        <div className="shrink-0">
          <ListPagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      </QueryState>

      {footer}
    </section>
  )
}
