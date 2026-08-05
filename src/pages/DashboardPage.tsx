import { Link, useNavigate } from 'react-router-dom'
import { useMemo, useRef, useState } from 'react'
import {
  ChartBar,
  CircleAlert,
  Layers,
  ListChecks,
  TimerReset,
} from 'lucide-react'
import {
  BlockedProjectsBarChart,
  StatusDonutChart,
} from '@/components/dashboard/DashboardCharts'
import { DashboardKpiCard } from '@/components/dashboard/DashboardKpiCard'
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
import {
  isCompanyDirector,
  isFactoryManager,
  isProjectManager,
} from '@/lib/roles'
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
import { formatProgress } from '@/lib/progress'
import type { ProjectStatus, TaskStatus } from '@/types/database'

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
type TaskActivityFilter = 'all' | TaskStatus
type OverdueFilter = 'all' | 'overdue'
type PhaseIssueFilter = 'all' | 'phase_issues'
type AttentionDrill =
  | 'blocked'
  | 'overdue'
  | 'proposed'
  | 'draft'
  | 'upcoming'
  | 'phase_issues'
  | 'in_progress'
  | null

export function DashboardPage() {
  const { t, locale } = useTranslation()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const roleLabel = profile ? getRoleLabel(t, profile.role) : t('common.user')
  const isDirector = isCompanyDirector(profile?.role)
  const isManager = isFactoryManager(profile?.role)
  const isPm = isProjectManager(profile?.role)
  const projectDetailsRef = useRef<HTMLDivElement>(null)

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
  const [overdueFilter, setOverdueFilter] = useState<OverdueFilter>('all')
  const [phaseIssueFilter, setPhaseIssueFilter] =
    useState<PhaseIssueFilter>('all')
  const [attentionDrill, setAttentionDrill] = useState<AttentionDrill>(null)
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

  const scrollToProjects = () => {
    projectDetailsRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  const resetListFilters = () => {
    setProjectSearch('')
    setStatusFilter('all')
    setFactoryFilter('all')
    setProgressFilter('all')
    setBlockedFilter('all')
    setTaskActivityFilter('all')
    setOverdueFilter('all')
    setPhaseIssueFilter('all')
    setAttentionDrill(null)
  }

  const applyAttentionDrill = (drill: AttentionDrill) => {
    resetListFilters()
    setAttentionDrill(drill)

    if (drill === 'blocked') {
      setBlockedFilter('blocked')
    } else if (drill === 'overdue') {
      setOverdueFilter('overdue')
    } else if (drill === 'proposed') {
      setStatusFilter('proposed')
    } else if (drill === 'draft') {
      setStatusFilter('draft')
    } else if (drill === 'in_progress') {
      setStatusFilter('in_progress')
    } else if (drill === 'upcoming') {
      setTaskActivityFilter('in_progress')
    } else if (drill === 'phase_issues') {
      setPhaseIssueFilter('phase_issues')
    }

    scrollToProjects()
  }

  const applyProjectStatusDrill = (status: string) => {
    if (!PROJECT_STATUS_FILTERS.includes(status as ProjectStatus)) {
      return
    }
    const next = status as ProjectStatus
    resetListFilters()
    setStatusFilter(next)
    if (next === 'proposed') {
      setAttentionDrill('proposed')
    } else if (next === 'draft') {
      setAttentionDrill('draft')
    } else if (next === 'in_progress') {
      setAttentionDrill('in_progress')
    }
    scrollToProjects()
  }

  const applyTaskStatusDrill = (status: string) => {
    if (
      status !== 'todo' &&
      status !== 'in_progress' &&
      status !== 'blocked' &&
      status !== 'done'
    ) {
      return
    }
    resetListFilters()
    if (status === 'blocked') {
      setBlockedFilter('blocked')
      setAttentionDrill('blocked')
    } else {
      setTaskActivityFilter(status)
    }
    scrollToProjects()
  }

  const applyProgressDrill = (range: ProgressFilter) => {
    resetListFilters()
    setProgressFilter(range)
    scrollToProjects()
  }

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

      if (overdueFilter === 'overdue' && project.overdueTaskCount === 0) {
        return false
      }

      if (phaseIssueFilter === 'phase_issues' && !project.hasPhaseIssue) {
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
      if (taskActivityFilter === 'blocked' && project.blockedTaskCount === 0) {
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
    overdueFilter,
    phaseIssueFilter,
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
    taskActivityFilter !== 'all' ||
    overdueFilter !== 'all' ||
    phaseIssueFilter !== 'all'

  const projectStatusChart = insights
    ? PROJECT_STATUS_FILTERS.map((status, index) => ({
        key: status,
        label: t(`projectStatus.${status}`),
        value: insights.projectStatusCounts[status],
        color: `var(--chart-${(index % 5) + 1})`,
      })).filter((item) => item.value > 0)
    : []

  const taskStatusChart = insights
    ? (
        [
          {
            key: 'todo',
            label: t('taskStatus.todo'),
            value: insights.taskStatusCounts.todo,
            color: 'var(--chart-2)',
          },
          {
            key: 'in_progress',
            label: t('taskStatus.in_progress'),
            value: insights.taskStatusCounts.in_progress,
            color: 'var(--chart-3)',
          },
          {
            key: 'blocked',
            label: t('taskStatus.blocked'),
            value: insights.taskStatusCounts.blocked,
            color: 'var(--destructive)',
          },
          {
            key: 'done',
            label: t('taskStatus.done'),
            value: insights.taskStatusCounts.done,
            color: 'var(--chart-1)',
          },
        ] as const
      ).filter((item) => item.value > 0)
    : []

  const blockedCount =
    stats?.blockedTaskCount ?? insights?.taskStatusCounts.blocked ?? 0
  const overdueCount =
    stats?.overdueTaskCount ?? insights?.overdueTaskCount ?? 0
  const proposedCount = stats?.proposedCount ?? insights?.proposedCount ?? 0
  const draftCount = stats?.draftCount ?? 0
  const inProgressCount =
    stats?.inProgressCount ?? insights?.projectStatusCounts.in_progress ?? 0
  const upcomingCount = insights?.upcomingDueTaskCount ?? 0
  const phaseIssueCount = insights?.phaseIssueCount ?? 0

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
        isLoading={isLoading || isInsightsLoading}
        error={error ?? insightsError}
        loadingMessage={t('dashboard.loading')}
        errorMessage={t('dashboard.loadFailed')}
        onRetry={() => {
          void refetch()
          void refetchInsights()
        }}
        isRetrying={isFetching || isInsightsFetching}
      >
        {stats && insights ? (
          <>
            <div className="space-y-2">
              <div>
                <h2 className="text-base font-medium">
                  {t('dashboard.attentionTitle')}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t('dashboard.attentionDescription')}
                </p>
              </div>
              <StaggerGroup className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <DashboardKpiCard
                  label={t('dashboard.blockedTasks')}
                  value={blockedCount}
                  tone="danger"
                  active={attentionDrill === 'blocked'}
                  description={t('dashboard.drillHint')}
                  onClick={() => applyAttentionDrill('blocked')}
                  action={
                    <Button asChild size="sm" variant="outline">
                      <Link
                        to="/escalations"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {t('common.viewEscalations')}
                      </Link>
                    </Button>
                  }
                />
                <DashboardKpiCard
                  label={t('dashboard.overdueTasks')}
                  value={overdueCount}
                  tone="danger"
                  active={attentionDrill === 'overdue'}
                  description={t('dashboard.drillHint')}
                  onClick={() => applyAttentionDrill('overdue')}
                />
                {(isDirector || isManager) && (
                  <DashboardKpiCard
                    label={t('dashboard.proposedProjects')}
                    value={proposedCount}
                    tone="warning"
                    active={attentionDrill === 'proposed'}
                    description={t('dashboard.drillHint')}
                    onClick={() => applyAttentionDrill('proposed')}
                  />
                )}
                {isManager ? (
                  <DashboardKpiCard
                    label={t('dashboard.draftProjects')}
                    value={draftCount}
                    active={attentionDrill === 'draft'}
                    description={t('dashboard.drillHint')}
                    onClick={() => applyAttentionDrill('draft')}
                  />
                ) : null}
                {isManager || isPm ? (
                  <DashboardKpiCard
                    label={t('dashboard.inProgressProjects')}
                    value={inProgressCount}
                    active={attentionDrill === 'in_progress'}
                    description={t('dashboard.drillHint')}
                    onClick={() => applyAttentionDrill('in_progress')}
                  />
                ) : null}
                <DashboardKpiCard
                  label={t('dashboard.upcomingDeadlines')}
                  value={upcomingCount}
                  tone="warning"
                  active={attentionDrill === 'upcoming'}
                  description={t('dashboard.drillHint')}
                  onClick={() => applyAttentionDrill('upcoming')}
                />
                <DashboardKpiCard
                  label={t('dashboard.phaseIssues')}
                  value={phaseIssueCount}
                  tone={phaseIssueCount > 0 ? 'warning' : 'default'}
                  active={attentionDrill === 'phase_issues'}
                  description={t('dashboard.phaseIssuesDescription', {
                    overdue: insights.overduePhaseCount,
                    schedule: insights.scheduleDeviationPhaseCount,
                    financial: insights.financialDeviationPhaseCount,
                  })}
                  onClick={() => applyAttentionDrill('phase_issues')}
                />
                <DashboardKpiCard
                  label={t('dashboard.activeProjects')}
                  value={stats.activeProjectCount}
                />
                <DashboardKpiCard
                  label={t('dashboard.averageProgress')}
                  value={formatProgress(stats.averageProgress)}
                />
              </StaggerGroup>
            </div>

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
                <CardContent>
                  <StatusDonutChart
                    data={projectStatusChart}
                    activeKey={statusFilter === 'all' ? null : statusFilter}
                    onSliceClick={applyProjectStatusDrill}
                    emptyLabel={t('dashboard.noChartData')}
                  />
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
                <CardContent>
                  <StatusDonutChart
                    data={[...taskStatusChart]}
                    activeKey={
                      blockedFilter === 'blocked'
                        ? 'blocked'
                        : taskActivityFilter === 'all'
                          ? null
                          : taskActivityFilter
                    }
                    onSliceClick={applyTaskStatusDrill}
                    emptyLabel={t('dashboard.noChartData')}
                  />
                </CardContent>
              </Card>
            </StaggerGroup>

            <StaggerGroup className="grid gap-4 xl:grid-cols-3">
              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CircleAlert className="size-4 text-muted-foreground" />
                    {t('dashboard.topBlockedProjects')}
                  </CardTitle>
                  <CardDescription>
                    {t('dashboard.topBlockedProjectsDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BlockedProjectsBarChart
                    data={insights.topBlockedProjects}
                    emptyLabel={t('dashboard.noBlockedProjects')}
                    onBarClick={(projectId) => {
                      void navigate(`/projects/${projectId}`)
                    }}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TimerReset className="size-4 text-muted-foreground" />
                    {t('dashboard.progressBuckets')}
                  </CardTitle>
                  <CardDescription>
                    {t('dashboard.progressBucketsDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2">
                  {insights.progressBuckets.map((bucket) => {
                    const range = bucket.label as ProgressFilter
                    const active = progressFilter === range
                    return (
                      <button
                        key={bucket.label}
                        type="button"
                        onClick={() => applyProgressDrill(range)}
                        className={`flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-start transition-colors hover:bg-muted/40 ${
                          active ? 'ring-2 ring-primary' : ''
                        }`}
                      >
                        <span className="text-xs text-muted-foreground">
                          {t('dashboard.progressRange', {
                            range: bucket.label,
                          })}
                        </span>
                        <span className="text-lg font-semibold tabular-nums">
                          {bucket.count}
                        </span>
                      </button>
                    )
                  })}
                </CardContent>
              </Card>
            </StaggerGroup>

            {(insights.overduePhaseCount > 0 ||
              insights.scheduleDeviationPhaseCount > 0 ||
              insights.financialDeviationPhaseCount > 0) && (
              <Card size="sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Layers className="size-4 text-muted-foreground" />
                    {t('dashboard.phaseSignalsTitle')}
                  </CardTitle>
                  <CardDescription>
                    {t('dashboard.phaseSignalsDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="tabular-nums">
                    {t('dashboard.overduePhases')}: {insights.overduePhaseCount}
                  </Badge>
                  <Badge variant="secondary" className="tabular-nums">
                    {t('dashboard.scheduleDeviationPhases')}:{' '}
                    {insights.scheduleDeviationPhaseCount}
                  </Badge>
                  <Badge variant="secondary" className="tabular-nums">
                    {t('dashboard.financialDeviationPhases')}:{' '}
                    {insights.financialDeviationPhaseCount}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applyAttentionDrill('phase_issues')}
                  >
                    {t('dashboard.viewPhaseIssues')}
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </QueryState>

      <div ref={projectDetailsRef}>
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
              {hasActiveProjectFilters ? (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">
                    {t('dashboard.activeDrill')}
                  </span>
                  {statusFilter !== 'all' ? (
                    <Badge variant="secondary">
                      {getProjectStatusLabel(t, statusFilter)}
                    </Badge>
                  ) : null}
                  {blockedFilter === 'blocked' ? (
                    <Badge variant="destructive">
                      {t('dashboard.filterBlockedOnly')}
                    </Badge>
                  ) : null}
                  {overdueFilter === 'overdue' ? (
                    <Badge variant="destructive">
                      {t('dashboard.filterOverdueOnly')}
                    </Badge>
                  ) : null}
                  {phaseIssueFilter === 'phase_issues' ? (
                    <Badge variant="secondary">
                      {t('dashboard.filterPhaseIssuesOnly')}
                    </Badge>
                  ) : null}
                  {progressFilter !== 'all' ? (
                    <Badge variant="secondary">{progressFilter}%</Badge>
                  ) : null}
                  {taskActivityFilter !== 'all' ? (
                    <Badge variant="secondary">
                      {t(`taskStatus.${taskActivityFilter}`)}
                    </Badge>
                  ) : null}
                  <Button size="sm" variant="ghost" onClick={resetListFilters}>
                    {t('list.clearFilters')}
                  </Button>
                </div>
              ) : null}

              <ListToolbar
                search={projectSearch}
                onSearchChange={setProjectSearch}
                searchPlaceholder={t('dashboard.projectDetailsSearch')}
                hasActiveFilters={hasActiveProjectFilters}
                onClear={resetListFilters}
                filters={[
                  {
                    id: 'dashboard-project-status-filter',
                    label: t('common.status'),
                    value: statusFilter,
                    onChange: (value) => {
                      setAttentionDrill(null)
                      setStatusFilter(value as 'all' | ProjectStatus)
                    },
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
                    onChange: (value) => {
                      setAttentionDrill(null)
                      setProgressFilter(value as ProgressFilter)
                    },
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
                    onChange: (value) => {
                      setAttentionDrill(null)
                      setBlockedFilter(value as BlockedFilter)
                    },
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
                    id: 'dashboard-project-overdue-filter',
                    label: t('dashboard.filterOverdueState'),
                    value: overdueFilter,
                    onChange: (value) => {
                      setAttentionDrill(null)
                      setOverdueFilter(value as OverdueFilter)
                    },
                    options: [
                      { value: 'all', label: t('list.all') },
                      {
                        value: 'overdue',
                        label: t('dashboard.filterOverdueOnly'),
                      },
                    ],
                  },
                  {
                    id: 'dashboard-project-phase-filter',
                    label: t('dashboard.filterPhaseIssues'),
                    value: phaseIssueFilter,
                    onChange: (value) => {
                      setAttentionDrill(null)
                      setPhaseIssueFilter(value as PhaseIssueFilter)
                    },
                    options: [
                      { value: 'all', label: t('list.all') },
                      {
                        value: 'phase_issues',
                        label: t('dashboard.filterPhaseIssuesOnly'),
                      },
                    ],
                  },
                  {
                    id: 'dashboard-project-task-activity-filter',
                    label: t('dashboard.filterTaskActivity'),
                    value: taskActivityFilter,
                    onChange: (value) => {
                      setAttentionDrill(null)
                      setTaskActivityFilter(value as TaskActivityFilter)
                    },
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
                      {
                        value: 'blocked',
                        label: t('dashboard.filterHasBlockedTasks'),
                      },
                    ],
                  },
                  ...(isDirector
                    ? [
                        {
                          id: 'dashboard-project-factory-filter',
                          label: t('common.factory'),
                          value: factoryFilter,
                          onChange: (value: string) => {
                            setAttentionDrill(null)
                            setFactoryFilter(value)
                          },
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
                      <TableHead>{t('dashboard.overdueTasks')}</TableHead>
                      <TableHead>{t('dashboard.blockedTasks')}</TableHead>
                      <TableHead>{t('dashboard.phaseIssues')}</TableHead>
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
                            {project.overdueTaskCount > 0 ? (
                              <Badge
                                variant="destructive"
                                className="tabular-nums"
                              >
                                {project.overdueTaskCount}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">0</Badge>
                            )}
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
                          <TableCell>
                            {project.hasPhaseIssue ? (
                              <Badge
                                variant="secondary"
                                className="tabular-nums"
                              >
                                {project.overduePhaseCount > 0
                                  ? project.overduePhaseCount
                                  : t('dashboard.phaseIssueFlag')}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">—</Badge>
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
                          colSpan={isDirector ? 12 : 11}
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
      </div>
    </section>
  )
}
