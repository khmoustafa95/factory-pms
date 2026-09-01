import type { ReactNode } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { ResponsiveTable } from '@/components/ResponsiveTable'

interface AdaptiveListProps<T> {
  items: T[]
  emptyMessage: string
  emptyAction?: ReactNode
  getKey: (item: T) => string
  renderMobileCard: (item: T) => ReactNode
  children: ReactNode
  className?: string
}

export function AdaptiveList<T>({
  items,
  emptyMessage,
  emptyAction,
  getKey,
  renderMobileCard,
  children,
  className,
}: AdaptiveListProps<T>) {
  if (items.length === 0) {
    return (
      <EmptyState description={emptyMessage} action={emptyAction} className={className} />
    )
  }

  return (
    <div className={className}>
      <div className="space-y-3 md:hidden">
        {items.map((item, index) => (
          <article
            key={getKey(item)}
            className="motion-stagger-item app-panel p-4"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {renderMobileCard(item)}
          </article>
        ))}
      </div>

      <ResponsiveTable className="hidden md:block">{children}</ResponsiveTable>
    </div>
  )
}
