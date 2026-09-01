import { cn } from '@/lib/utils'

interface FetchingBarProps {
  active: boolean
  className?: string
}

export function FetchingBar({ active, className }: FetchingBarProps) {
  if (!active) {
    return null
  }

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-primary/20',
        className,
      )}
    >
      <div className="motion-shimmer h-full w-1/3 bg-primary" />
    </div>
  )
}
