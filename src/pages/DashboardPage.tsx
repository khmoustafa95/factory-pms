import { Link } from 'react-router-dom'
import { Building2, ClipboardList, Users, AlertTriangle } from 'lucide-react'
import { StaggerGroup } from '@/components/motion'
import { QueryState } from '@/components/QueryState'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/contexts/LocaleContext'
import { useDashboardStats } from '@/hooks/useDashboard'
import { isCompanyDirector, isFactoryManager } from '@/lib/roles'
import { getRoleLabel } from '@/lib/i18n-format'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatProgress } from '@/lib/progress'

export function DashboardPage() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const roleLabel = profile ? getRoleLabel(t, profile.role) : t('common.user')
  const isDirector = isCompanyDirector(profile?.role)
  const isManager = isFactoryManager(profile?.role)
  const {
    data: stats,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useDashboardStats()

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {t('dashboard.title')}
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          {t('dashboard.welcome', {
            name: profile
              ? t('dashboard.welcomeName', { name: profile.full_name })
              : '',
            role: roleLabel,
          })}
        </p>
      </div>

      <QueryState
        isLoading={isLoading}
        error={error}
        loadingMessage={t('dashboard.loading')}
        errorMessage={t('dashboard.loadFailed')}
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      >
        {stats ? (
          <StaggerGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>
                  {t('dashboard.activeFactories')}
                </CardDescription>
                <CardTitle className="text-3xl">{stats.factoryCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>
                  {t('dashboard.activeProjects')}
                </CardDescription>
                <CardTitle className="text-3xl">
                  {stats.activeProjectCount}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>
                  {t('dashboard.averageProgress')}
                </CardDescription>
                <CardTitle className="text-3xl">
                  {formatProgress(stats.averageProgress)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('dashboard.blockedTasks')}</CardDescription>
                <CardTitle className="text-3xl text-destructive">
                  {stats.blockedTaskCount}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button asChild size="sm" variant="outline">
                  <Link to="/escalations">{t('common.viewEscalations')}</Link>
                </Button>
              </CardContent>
            </Card>
          </StaggerGroup>
        ) : null}
      </QueryState>

      <StaggerGroup className="grid gap-4 md:grid-cols-3">
        {isCompanyDirector(profile?.role) ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="size-5" />
                  {t('dashboard.factoriesTitle')}
                </CardTitle>
                <CardDescription>
                  {t('dashboard.factoriesDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link to="/factories">{t('common.openFactories')}</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="size-5" />
                  {t('dashboard.accountsTitle')}
                </CardTitle>
                <CardDescription>
                  {t('dashboard.accountsDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline">
                  <Link to="/accounts">{t('common.manageAccounts')}</Link>
                </Button>
              </CardContent>
            </Card>
          </>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="size-5" />
              {t('dashboard.escalationsTitle')}
            </CardTitle>
            <CardDescription>
              {t('dashboard.escalationsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to="/escalations">{t('common.openEscalations')}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="size-5" />
              {t('dashboard.projectsTitle')}
            </CardTitle>
            <CardDescription>
              {isManager
                ? t('dashboard.projectsManagerDescription')
                : isDirector
                  ? t('dashboard.projectsDirectorDescription')
                  : t('dashboard.projectsPmDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant={isDirector ? 'outline' : 'default'}>
              <Link to="/projects">{t('common.openProjects')}</Link>
            </Button>
          </CardContent>
        </Card>
      </StaggerGroup>
    </section>
  )
}
