import type { ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { StatusMessage } from '@/components/StatusMessage'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/contexts/LocaleContext'
import { getQueryErrorMessage } from '@/lib/query-error'
import { cn } from '@/lib/utils'

interface QueryStateProps {
  isLoading: boolean
  error: unknown
  loadingMessage: string
  errorMessage: string
  onRetry?: () => void
  isRetrying?: boolean
  children: ReactNode
  className?: string
  loadingClassName?: string
}

function QueryStateSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('space-y-3', className)}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="motion-shimmer h-4 w-2/5 rounded" />
      <div className="motion-shimmer h-24 rounded-lg" />
      <div className="motion-shimmer h-24 rounded-lg" />
    </div>
  )
}

export function QueryState({
  isLoading,
  error,
  loadingMessage,
  errorMessage,
  onRetry,
  isRetrying = false,
  children,
  className,
  loadingClassName,
}: QueryStateProps) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className={className}>
        <QueryStateSkeleton className={loadingClassName} />
        <p className="sr-only">{loadingMessage}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('space-y-3', className)}>
        <StatusMessage variant="error">
          {getQueryErrorMessage(error, errorMessage)}
        </StatusMessage>
        {onRetry ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={isRetrying}
          >
            <RefreshCw
              className={cn('size-4', isRetrying && 'animate-spin')}
              aria-hidden
            />
            {isRetrying ? t('common.retrying') : t('common.retry')}
          </Button>
        ) : null}
      </div>
    )
  }

  return <div className="motion-fade-in">{children}</div>
}
