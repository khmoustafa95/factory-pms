import { Loader2 } from 'lucide-react'
import { useTranslation } from '@/contexts/LocaleContext'

export function RouteFallback() {
  const { t } = useTranslation()

  return (
    <div
      className="motion-fade-in flex min-h-[40vh] flex-col items-center justify-center gap-3 text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="motion-spinner size-6 text-primary" aria-hidden />
      {t('common.loading')}
    </div>
  )
}
