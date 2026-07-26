import { Link } from 'react-router-dom'
import { Building2, ClipboardList, Users, AlertTriangle } from 'lucide-react'
import { StaggerGroup } from '@/components/motion'
import { PageHeader } from '@/components/PageHeader'
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
    <section className="space-y-6">
      <PageHeader
        title={t('dashboard.title')}
        description={t('dashboard.welcome', {
          name: profile
            ? t('dashboard.welcomeName', { name: profile.full_name })
            : '',
          role: roleLabel,
        })}
      />

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
            <Card size="sm">
              <CardHeader className="pb-2">
                <CardDescription>
                  {t('dashboard.activeFactories')}
                </CardDescription>
                <CardTitle className="text-3xl font-semibold tabular-nums">
                  {stats.factoryCount}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card size="sm">
              <CardHeader className="pb-2">
                <CardDescription>
                  {t('dashboard.activeProjects')}
                </CardDescription>
                <CardTitle className="text-3xl font-semibold tabular-nums">
                  {stats.activeProjectCount}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card size="sm">
              <CardHeader className="pb-2">
                <CardDescription>
                  {t('dashboard.averageProgress')}
                </CardDescription>
                <CardTitle className="text-3xl font-semibold tabular-nums">
                  {formatProgress(stats.averageProgress)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card size="sm">
              <CardHeader className="pb-2">
                <CardDescription>{t('dashboard.blockedTasks')}</CardDescription>
                <CardTitle className="text-3xl font-semibold tabular-nums text-destructive">
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

      <StaggerGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isCompanyDirector(profile?.role) ? (
          <>
            <Card interactive>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="size-4 text-muted-foreground" />
                  {t('dashboard.factoriesTitle')}
                </CardTitle>
                <CardDescription>
                  {t('dashboard.factoriesDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" size="sm">
                  <Link to="/factories">{t('common.openFactories')}</Link>
                </Button>
              </CardContent>
            </Card>

            <Card interactive>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="size-4 text-muted-foreground" />
                  {t('dashboard.accountsTitle')}
                </CardTitle>
                <CardDescription>
                  {t('dashboard.accountsDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" size="sm">
                  <Link to="/accounts">{t('common.manageAccounts')}</Link>
                </Button>
              </CardContent>
            </Card>
          </>
        ) : null}

        <Card interactive>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-muted-foreground" />
              {t('dashboard.escalationsTitle')}
            </CardTitle>
            <CardDescription>
              {t('dashboard.escalationsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link to="/escalations">{t('common.openEscalations')}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card interactive>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="size-4 text-muted-foreground" />
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
            <Button asChild variant="outline" size="sm">
              <Link to="/projects">{t('common.openProjects')}</Link>
            </Button>
          </CardContent>
        </Card>
      </StaggerGroup>
    </section>
  )
}
