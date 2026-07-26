import { cn } from '@/lib/utils'
import { formatProgress } from '@/lib/progress'

interface ProgressBarProps {
  value: number
  className?: string
  label?: string
}

export function ProgressBar({ value, className, label }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))

  return (
    <div className={cn('space-y-1', className)}>
      {label ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="min-w-0 flex-1 text-start text-muted-foreground">
            {label}
          </span>
          <span className="shrink-0 font-medium tabular-nums text-foreground">
            {formatProgress(clamped)}
          </span>
        </div>
      ) : null}
      <div className="flex h-2 w-full justify-start overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
