import type { ReactNode } from 'react'
import { TabsList } from '@/components/ui/tabs'
import { useTranslation } from '@/contexts/LocaleContext'
import { cn } from '@/lib/utils'

interface ScrollableTabsListProps {
  children: ReactNode
  className?: string
}

export function ScrollableTabsList({
  children,
  className,
}: ScrollableTabsListProps) {
  const { dir } = useTranslation()

  return (
    <div
      className={cn(
        'relative -mx-1 px-1',
        dir === 'rtl'
          ? '[mask-image:linear-gradient(to_left,black_90%,transparent)]'
          : '[mask-image:linear-gradient(to_right,black_90%,transparent)]',
      )}
    >
      <TabsList
        className={cn(
          'w-full justify-start overflow-x-auto',
          className,
        )}
      >
        {children}
      </TabsList>
    </div>
  )
}
