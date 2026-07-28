import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Building2,
  ChartBar,
  CircleAlert,
  ClipboardList,
  ListChecks,
  TimerReset,
  Users,
} from 'lucide-react'
import { StaggerGroup } from '@/components/motion'
import { ListToolbar } from '@/components/ListToolbar'
import { PageHeader } from '@/components/PageHeader'
import { QueryState } from '@/components/QueryState'
import { ProjectStatusBadge } from '@/components/projects/ProjectStatusBadge'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/contexts/LocaleContext'
import {
  useDashboardInsights,
  useDashboardProjects,
  useDashboardStats,
} from '@/hooks/useDashboard'
import { isCompanyDirector, isFactoryManager } from '@/lib/roles'
import {
  formatFactoryLabel,
  formatLocalizedBudget,
  getProjectStatusLabel,
  getRoleLabel,
} from '@/lib/i18n-format'
import { formatProjectSchedule } from '@/lib/project-schedule'
import { buildFactoryFilterOptions } from '@/lib/list-filters'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { formatProgress } from '@/lib/progress'
import type { ProjectStatus } from '@/types/database'

const PROJECT_STATUS_FILTERS: ProjectStatus[] = [
  'draft',
  'proposed',
  'approved',
  'rejected',
  'in_progress',
  'completed',
  'paused',
]

type ProgressFilter = 'all' | '0-24' | '25-49' | '50-74' | '75-99' | '100'
type BlockedFilter = 'all' | 'blocked' | 'not_blocked'
type TaskActivityFilter = 'all' | 'in_progress' | 'done' | 'todo'

export function DashboardPage() {
  const { t, locale } = useTranslation()
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
  const {
    data: insights,
    isLoading: isInsightsLoading,
    error: insightsError,
    refetch: refetchInsights,
    isFetching: isInsightsFetching,
  } = useDashboardInsights()
  const {
    data: dashboardProjects = [],
    isLoading: isProjectsLoading,
    error: projectsError,
    refetch: refetchProjects,
    isFetching: isProjectsFetching,
  } = useDashboardProjects()
  const [projectSearch, setProjectSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all')
  const [factoryFilter, setFactoryFilter] = useState('all')
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>('all')
  const [blockedFilter, setBlockedFilter] = useState<BlockedFilter>('all')
  const [taskActivityFilter, setTaskActivityFilter] =
    useState<TaskActivityFilter>('all')
  const notAvailable = t('common.notAvailable')

  const factoryFilterOptions = useMemo(() => {
    const uniqueFactories = new Map<
      string,
      { id: string; name: string; code: string }
    >()
    for (const project of dashboardProjects) {
      if (!project.factory) {
        continue
      }
      uniqueFactories.set(project.factory.id, project.factory)
    }
    return buildFactoryFilterOptions(
      Array.from(uniqueFactories.values()),
      t('list.allFactories'),
    )
  }, [dashboardProjects, t])

  const filteredProjects = useMemo(() => {
    const normalizedSearch = projectSearch.trim().toLowerCase()

    return dashboardProjects.filter((project) => {
      if (statusFilter !== 'all' && project.status !== statusFilter) {
        return false
      }

      if (
        factoryFilter !== 'all' &&
        (project.factory?.id ?? 'no-factory') !== factoryFilter
      ) {
        return false
      }

      if (progressFilter !== 'all') {
        const value = Math.max(
          0,
          Math.min(100, Math.round(Number(project.progressPercent))),
        )
        const inRange =
          (progressFilter === '0-24' && value >= 0 && value <= 24) ||
          (progressFilter === '25-49' && value >= 25 && value <= 49) ||
          (progressFilter === '50-74' && value >= 50 && value <= 74) ||
          (progressFilter === '75-99' && value >= 75 && value <= 99) ||
          (progressFilter === '100' && value === 100)

        if (!inRange) {
          return false
        }
      }

      if (blockedFilter === 'blocked' && project.blockedTaskCount === 0) {
        return false
      }
      if (blockedFilter === 'not_blocked' && project.blockedTaskCount > 0) {
        return false
      }

      if (
        taskActivityFilter === 'in_progress' &&
        project.inProgressTaskCount === 0
      ) {
        return false
      }
      if (taskActivityFilter === 'done' && project.doneTaskCount === 0) {
        return false
      }
      if (taskActivityFilter === 'todo' && project.todoTaskCount === 0) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      const factoryLabel = project.factory
        ? formatFactoryLabel(project.factory).toLowerCase()
        : ''

      return (
        project.title.toLowerCase().includes(normalizedSearch) ||
        factoryLabel.includes(normalizedSearch)
      )
    })
  }, [
    blockedFilter,
    dashboardProjects,
    factoryFilter,
    progressFilter,
    projectSearch,
    statusFilter,
    taskActivityFilter,
  ])

  const hasActiveProjectFilters =
    projectSearch.trim().length > 0 ||
    statusFilter !== 'all' ||
    factoryFilter !== 'all' ||
    progressFilter !== 'all' ||
    blockedFilter !== 'all' ||
    taskActivityFilter !== 'all'

  const taskStatusChart = insights
    ? [
        {
          key: 'todo',
          label: t('taskStatus.todo'),
          value: insights.taskStatusCounts.todo,
        },
        {
          key: 'in_progress',
          label: t('taskStatus.in_progress'),
          value: insights.taskStatusCounts.in_progress,
        },
        {
          key: 'blocked',
          label: t('taskStatus.blocked'),
          value: insights.taskStatusCounts.blocked,
          tone: 'text-destructive',
          barTone: 'bg-destructive',
        },
        {
          key: 'done',
          label: t('taskStatus.done'),
          value: insights.taskStatusCounts.done,
        },
      ]
    : []

  const projectStatusChart = insights
    ? [
        {
          key: 'draft',
          label: t('projectStatus.draft'),
          value: insights.projectStatusCounts.draft,
        },
        {
          key: 'proposed',
          label: t('projectStatus.proposed'),
          value: insights.projectStatusCounts.proposed,
        },
        {
          key: 'approved',
          label: t('projectStatus.approved'),
          value: insights.projectStatusCounts.approved,
        },
        {
          key: 'rejected',
          label: t('projectStatus.rejected'),
          value: insights.projectStatusCounts.rejected,
          tone: 'text-destructive',
          barTone: 'bg-destructive',
        },
        {
          key: 'in_progress',
          label: t('projectStatus.in_progress'),
          value: insights.projectStatusCounts.in_progress,
        },
        {
          key: 'completed',
          label: t('projectStatus.completed'),
          value: insights.projectStatusCounts.completed,
        },
        {
          key: 'paused',
          label: t('projectStatus.paused'),
          value: insights.projectStatusCounts.paused,
        },
      ]
    : []

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
          <StaggerGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      <QueryState
        isLoading={isInsightsLoading}
        error={insightsError}
        loadingMessage={t('dashboard.loading')}
        errorMessage={t('dashboard.loadFailed')}
        onRetry={() => void refetchInsights()}
        isRetrying={isInsightsFetching}
      >
        {insights ? (
          <>
            <StaggerGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card size="sm">
                <CardHeader className="pb-2">
                  <CardDescription>
                    {t('dashboard.totalProjects')}
                  </CardDescription>
                  <CardTitle className="text-2xl font-semibold tabular-nums">
                    {insights.totalProjects}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card size="sm">
                <CardHeader className="pb-2">
                  <CardDescription>{t('dashboard.totalTasks')}</CardDescription>
                  <CardTitle className="text-2xl font-semibold tabular-nums">
                    {insights.totalTasks}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card size="sm">
                <CardHeader className="pb-2">
                  <CardDescription>
                    {t('dashboard.overdueTasks')}
                  </CardDescription>
                  <CardTitle className="text-2xl font-semibold tabular-nums text-destructive">
                    {insights.overdueTaskCount}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card size="sm">
                <CardHeader className="pb-2">
                  <CardDescription>
                    {t('dashboard.upcomingDeadlines')}
                  </CardDescription>
                  <CardTitle className="text-2xl font-semibold tabular-nums">
                    {insights.upcomingDueTaskCount}
                  </CardTitle>
                </CardHeader>
              </Card>
            </StaggerGroup>

            <StaggerGroup className="grid gap-4 xl:grid-cols-3">
              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ChartBar className="size-4 text-muted-foreground" />
                    {t('dashboard.projectStatusDistribution')}
                  </CardTitle>
                  <CardDescription>
                    {t('dashboard.projectStatusDistributionDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {projectStatusChart.map((item) => (
                    <BarRow
                      key={item.key}
                      label={item.label}
                      value={item.value}
                      maxValue={insights.totalProjects}
                      tone={item.tone}
                      barTone={item.barTone}
                    />
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ListChecks className="size-4 text-muted-foreground" />
                    {t('dashboard.taskStatusDistribution')}
                  </CardTitle>
                  <CardDescription>
                    {t('dashboard.taskStatusDistributionDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {taskStatusChart.map((item) => (
                    <BarRow
                      key={item.key}
                      label={item.label}
                      value={item.value}
                      maxValue={insights.totalTasks}
                      tone={item.tone}
                      barTone={item.barTone}
                    />
                  ))}
                </CardContent>
              </Card>
            </StaggerGroup>

            <StaggerGroup className="grid gap-4 xl:grid-cols-3">
              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TimerReset className="size-4 text-muted-foreground" />
                    {t('dashboard.progressBuckets')}
                  </CardTitle>
                  <CardDescription>
                    {t('dashboard.progressBucketsDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {insights.progressBuckets.map((bucket) => (
                    <div
                      key={bucket.label}
                      className="rounded-lg border border-border/60 bg-muted/30 p-3"
                    >
                      <p className="text-xs text-muted-foreground">
                        {t('dashboard.progressRange', { range: bucket.label })}
                      </p>
                      <p className="mt-1 text-2xl font-semibold tabular-nums">
                        {bucket.count}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CircleAlert className="size-4 text-muted-foreground" />
                    {t('dashboard.topBlockedProjects')}
                  </CardTitle>
                  <CardDescription>
                    {t('dashboard.topBlockedProjectsDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {insights.topBlockedProjects.length ? (
                    insights.topBlockedProjects.map((item) => (
                      <div
                        key={item.projectId}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2"
                      >
                        <p className="line-clamp-1 text-sm">
                          {item.projectTitle}
                        </p>
                        <Badge variant="destructive" className="tabular-nums">
                          {item.blockedTaskCount}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t('dashboard.noBlockedProjects')}
                    </p>
                  )}
                </CardContent>
              </Card>
            </StaggerGroup>
          </>
        ) : null}
      </QueryState>

      <QueryState
        isLoading={isProjectsLoading}
        error={projectsError}
        loadingMessage={t('dashboard.loading')}
        errorMessage={t('dashboard.loadFailed')}
        onRetry={() => void refetchProjects()}
        isRetrying={isProjectsFetching}
      >
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.projectDetailsTitle')}</CardTitle>
            <CardDescription>
              {t('dashboard.projectDetailsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ListToolbar
              search={projectSearch}
              onSearchChange={setProjectSearch}
              searchPlaceholder={t('dashboard.projectDetailsSearch')}
              hasActiveFilters={hasActiveProjectFilters}
              onClear={() => {
                setProjectSearch('')
                setStatusFilter('all')
                setFactoryFilter('all')
                setProgressFilter('all')
                setBlockedFilter('all')
                setTaskActivityFilter('all')
              }}
              filters={[
                {
                  id: 'dashboard-project-status-filter',
                  label: t('common.status'),
                  value: statusFilter,
                  onChange: (value) =>
                    setStatusFilter(value as 'all' | ProjectStatus),
                  options: [
                    { value: 'all', label: t('list.allStatuses') },
                    ...PROJECT_STATUS_FILTERS.map((status) => ({
                      value: status,
                      label: getProjectStatusLabel(t, status),
                    })),
                  ],
                },
                {
                  id: 'dashboard-project-progress-filter',
                  label: t('dashboard.filterProgressRange'),
                  value: progressFilter,
                  onChange: (value) =>
                    setProgressFilter(value as ProgressFilter),
                  options: [
                    { value: 'all', label: t('list.all') },
                    { value: '0-24', label: '0-24%' },
                    { value: '25-49', label: '25-49%' },
                    { value: '50-74', label: '50-74%' },
                    { value: '75-99', label: '75-99%' },
                    { value: '100', label: '100%' },
                  ],
                },
                {
                  id: 'dashboard-project-blocked-filter',
                  label: t('dashboard.filterBlockedState'),
                  value: blockedFilter,
                  onChange: (value) => setBlockedFilter(value as BlockedFilter),
                  options: [
                    { value: 'all', label: t('list.all') },
                    {
                      value: 'blocked',
                      label: t('dashboard.filterBlockedOnly'),
                    },
                    {
                      value: 'not_blocked',
                      label: t('dashboard.filterNotBlockedOnly'),
                    },
                  ],
                },
                {
                  id: 'dashboard-project-task-activity-filter',
                  label: t('dashboard.filterTaskActivity'),
                  value: taskActivityFilter,
                  onChange: (value) =>
                    setTaskActivityFilter(value as TaskActivityFilter),
                  options: [
                    { value: 'all', label: t('list.all') },
                    {
                      value: 'in_progress',
                      label: t('dashboard.filterHasInProgressTasks'),
                    },
                    {
                      value: 'done',
                      label: t('dashboard.filterHasDoneTasks'),
                    },
                    {
                      value: 'todo',
                      label: t('dashboard.filterHasTodoTasks'),
                    },
                  ],
                },
                ...(isDirector
                  ? [
                      {
                        id: 'dashboard-project-factory-filter',
                        label: t('common.factory'),
                        value: factoryFilter,
                        onChange: setFactoryFilter,
                        options: factoryFilterOptions,
                      },
                    ]
                  : []),
              ]}
            />

            <div className="rounded-xl border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.title')}</TableHead>
                    {isDirector ? (
                      <TableHead>{t('common.factory')}</TableHead>
                    ) : null}
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{t('common.progress')}</TableHead>
                    <TableHead>{t('common.budget')}</TableHead>
                    <TableHead>{t('common.timeline')}</TableHead>
                    <TableHead>{t('dashboard.tasksDone')}</TableHead>
                    <TableHead>{t('dashboard.tasksInProgress')}</TableHead>
                    <TableHead>{t('dashboard.blockedTasks')}</TableHead>
                    <TableHead>{t('dashboard.tasksTotal')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.length ? (
                    filteredProjects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">
                          <Link
                            className="hover:underline"
                            to={`/projects/${project.id}`}
                          >
                            {project.title}
                          </Link>
                        </TableCell>
                        {isDirector ? (
                          <TableCell>
                            {project.factory
                              ? formatFactoryLabel(project.factory)
                              : notAvailable}
                          </TableCell>
                        ) : null}
                        <TableCell>
                          <ProjectStatusBadge status={project.status} />
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatProgress(project.progressPercent)}
                        </TableCell>
                        <TableCell>
                          {formatLocalizedBudget(
                            project.budget,
                            project.currency,
                            locale,
                            notAvailable,
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatProjectSchedule(
                            {
                              proposed_start_date: project.proposedStartDate,
                              proposed_end_date: project.proposedEndDate,
                              proposed_duration_value:
                                project.proposedDurationValue,
                              proposed_duration_unit:
                                project.proposedDurationUnit,
                              actual_start_date: project.actualStartDate,
                              actual_end_date: project.actualEndDate,
                            },
                            locale,
                            t,
                            notAvailable,
                          )}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {project.doneTaskCount}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {project.inProgressTaskCount}
                        </TableCell>
                        <TableCell>
                          {project.blockedTaskCount > 0 ? (
                            <Badge
                              variant="destructive"
                              className="tabular-nums"
                            >
                              {project.blockedTaskCount}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">0</Badge>
                          )}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {project.totalTaskCount}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={isDirector ? 11 : 10}
                        className="py-8 text-center text-muted-foreground"
                      >
                        {hasActiveProjectFilters
                          ? t('list.noResults')
                          : t('dashboard.noProjectDetails')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </QueryState>

      <StaggerGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isDirector ? (
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
        ) : null}

        {isDirector || isManager ? (
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

interface BarRowProps {
  label: string
  value: number
  maxValue: number
  tone?: string
  barTone?: string
}

function BarRow({ label, value, maxValue, tone, barTone }: BarRowProps) {
  const safeMax = maxValue > 0 ? maxValue : 1
  const ratio = Math.round((value / safeMax) * 100)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className={cn('text-muted-foreground', tone)}>{label}</span>
        <span className={cn('font-medium tabular-nums text-foreground', tone)}>
          {value}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full bg-primary transition-[width] duration-500 ease-out',
            barTone,
          )}
          style={{ width: `${ratio}%` }}
        />
      </div>
    </div>
  )
}
