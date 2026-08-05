import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DashboardKpiCardProps {
  label: string
  value: string | number
  description?: string
  tone?: 'default' | 'danger' | 'warning'
  active?: boolean
  onClick?: () => void
  action?: ReactNode
}

export function DashboardKpiCard({
  label,
  value,
  description,
  tone = 'default',
  active = false,
  onClick,
  action,
}: DashboardKpiCardProps) {
  const interactive = Boolean(onClick)

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) {
          return
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
      className={cn(
        'flex flex-col gap-2 rounded-xl bg-card p-4 text-start ring-1 ring-foreground/10 transition-colors',
        interactive &&
          'cursor-pointer hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active && 'ring-2 ring-primary',
      )}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          'text-3xl font-semibold tabular-nums',
          tone === 'danger' && 'text-destructive',
          tone === 'warning' && 'text-amber-700 dark:text-amber-400',
        )}
      >
        {value}
      </p>
      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
      {action ? (
        <div
          className="pt-1"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {action}
        </div>
      ) : null}
    </div>
  )
}
