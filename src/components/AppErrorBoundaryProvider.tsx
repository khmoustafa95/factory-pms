import { AppErrorBoundary } from '@/components/AppErrorBoundary'
import { useTranslation } from '@/contexts/LocaleContext'

export function AppErrorBoundaryProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { t } = useTranslation()

  return (
    <AppErrorBoundary
      labels={{
        title: t('errors.boundaryTitle'),
        description: t('errors.boundaryDescription'),
        retry: t('common.retry'),
      }}
    >
      {children}
    </AppErrorBoundary>
  )
}
