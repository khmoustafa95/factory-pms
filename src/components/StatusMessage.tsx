import { cn } from '@/lib/utils'

interface StatusMessageProps {
  children: React.ReactNode
  variant?: 'error' | 'warning' | 'info'
  className?: string
}

const variantClasses = {
  error:
    'border-destructive/30 bg-destructive/10 text-destructive dark:bg-destructive/15',
  warning:
    'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200',
  info: 'border-border bg-muted text-muted-foreground',
}

export function StatusMessage({
  children,
  variant = 'info',
  className,
}: StatusMessageProps) {
  return (
    <p
      role="status"
      className={cn(
        'rounded-md border px-3 py-2 text-sm',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </p>
  )
}
