import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/contexts/LocaleContext'
import type { UserRole } from '@/types/database'

interface RoleRouteProps {
  allowedRoles: UserRole[]
}

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { profile, isLoading } = useAuth()
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        {t('common.loading')}
      </div>
    )
  }

  if (!profile || !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
