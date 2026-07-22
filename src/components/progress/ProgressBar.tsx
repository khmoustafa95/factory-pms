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
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">{label}</span>
          <span className="font-medium text-slate-900">
            {formatProgress(clamped)}
          </span>
        </div>
      ) : null}
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-slate-900 transition-all"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
