import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/contexts/LocaleContext'

export function ProtectedRoute() {
  const { session, profile, isLoading, isConfigured } = useAuth()
  const { t } = useTranslation()

  if (!isConfigured) {
    return <Navigate to="/login" replace />
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        {t('auth.loadingSession')}
      </div>
    )
  }

  if (!session || !profile?.is_active) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
