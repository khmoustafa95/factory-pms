import { useTranslation } from '@/contexts/LocaleContext'

export function RouteFallback() {
  const { t } = useTranslation()

  return (
    <div
      className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      {t('common.loading')}
    </div>
  )
}
