import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ResponsiveTableProps {
  children: ReactNode
  className?: string
}

export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
  return (
    <div className={cn('app-panel min-h-0 overflow-hidden', className)}>
      <div data-slot="table-scroll" className="h-full min-h-0 overflow-auto">
        <div className="min-w-160">{children}</div>
      </div>
    </div>
  )
}
