import type { ReactNode } from 'react'
import { ResponsiveTable } from '@/components/ResponsiveTable'
import { cn } from '@/lib/utils'

interface AdaptiveListProps<T> {
  items: T[]
  emptyMessage: string
  getKey: (item: T) => string
  renderMobileCard: (item: T) => ReactNode
  children: ReactNode
  className?: string
}

export function AdaptiveList<T>({
  items,
  emptyMessage,
  getKey,
  renderMobileCard,
  children,
  className,
}: AdaptiveListProps<T>) {
  if (items.length === 0) {
    return (
      <p
        className={cn(
          'motion-fade-in app-panel py-10 text-center text-sm text-muted-foreground',
          className,
        )}
      >
        {emptyMessage}
      </p>
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
