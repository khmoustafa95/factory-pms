import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title?: string
  description: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'motion-fade-in app-panel flex flex-col items-center justify-center gap-3 px-6 py-12 text-center',
        className,
      )}
    >
      {Icon ? (
        <Icon className="size-10 text-muted-foreground/60" aria-hidden />
      ) : null}
      {title ? (
        <p className="text-sm font-medium text-foreground">{title}</p>
      ) : null}
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  )
}

interface EmptyStateButtonProps {
  label: string
  onClick: () => void
}

export function EmptyStateButton({ label, onClick }: EmptyStateButtonProps) {
  return (
    <Button type="button" size="sm" onClick={onClick}>
      {label}
    </Button>
  )
}
