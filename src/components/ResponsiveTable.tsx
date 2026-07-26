import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ResponsiveTableProps {
  children: ReactNode
  className?: string
}

export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
  return (
    <div className={cn('app-panel overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <div className="min-w-160">{children}</div>
      </div>
    </div>
  )
}
