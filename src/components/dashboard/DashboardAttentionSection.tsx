import { Link, useNavigate } from 'react-router-dom'
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
import {
  PROJECT_STATUS_FILTERS,
  type AttentionDrill,
  type BlockedFilter,
  type ProgressFilter,
  type TaskActivityFilter,
} from '@/components/dashboard/dashboard-types'
import { DashboardKpiCard } from '@/components/dashboard/DashboardKpiCard'
import { StaggerGroup } from '@/components/motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useTranslation } from '@/contexts/LocaleContext'
import type { DashboardInsights, DashboardStats } from '@/hooks/useDashboard'
import { formatProgress } from '@/lib/progress'
import type { ProjectStatus } from '@/types/database'

type DashboardAttentionSectionProps = {
  stats: DashboardStats
  insights: DashboardInsights
  isDirector: boolean
  isManager: boolean
  isPm: boolean
  attentionDrill: AttentionDrill
  statusFilter: 'all' | ProjectStatus
  blockedFilter: BlockedFilter
  taskActivityFilter: TaskActivityFilter
  progressFilter: ProgressFilter
  onAttentionDrill: (drill: AttentionDrill) => void
  onProjectStatusDrill: (status: string) => void
  onTaskStatusDrill: (status: string) => void
  onProgressDrill: (range: ProgressFilter) => void
  resolveBlockedProjectPath: (projectId: string) => string | null
}

export function DashboardAttentionSection({
  stats,
  insights,
  isDirector,
  isManager,
  isPm,
  attentionDrill,
  statusFilter,
  blockedFilter,
  taskActivityFilter,
  progressFilter,
  onAttentionDrill,
  onProjectStatusDrill,
  onTaskStatusDrill,
  onProgressDrill,
  resolveBlockedProjectPath,
}: DashboardAttentionSectionProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const projectStatusChart = PROJECT_STATUS_FILTERS.map((status, index) => ({
    key: status,
    label: t(`projectStatus.${status}`),
    value: insights.projectStatusCounts[status],
    color: `var(--chart-${(index % 5) + 1})`,
  })).filter((item) => item.value > 0)

  const taskStatusChart = (
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

  const blockedCount = stats.blockedTaskCount
  const overdueCount = stats.overdueTaskCount
  const proposedCount = stats.proposedCount
  const draftCount = stats.draftCount
  const inProgressCount = stats.inProgressCount
  const upcomingCount = insights.upcomingDueTaskCount
  const phaseIssueCount = insights.phaseIssueCount
  const underfundedCount = insights.underfundedProjectCount
  const overdueProcurementCount = insights.overdueProcurementCount

  return (
    <div className="space-y-4">
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
            onClick={() => onAttentionDrill('blocked')}
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
            onClick={() => onAttentionDrill('overdue')}
          />
          {(isDirector || isManager) && (
            <DashboardKpiCard
              label={t('dashboard.proposedProjects')}
              value={proposedCount}
              tone="warning"
              active={attentionDrill === 'proposed'}
              description={t('dashboard.drillHint')}
              onClick={() => onAttentionDrill('proposed')}
            />
          )}
          {isManager ? (
            <DashboardKpiCard
              label={t('dashboard.draftProjects')}
              value={draftCount}
              active={attentionDrill === 'draft'}
              description={t('dashboard.drillHint')}
              onClick={() => onAttentionDrill('draft')}
            />
          ) : null}
          {isManager || isPm ? (
            <DashboardKpiCard
              label={t('dashboard.inProgressProjects')}
              value={inProgressCount}
              active={attentionDrill === 'in_progress'}
              description={t('dashboard.drillHint')}
              onClick={() => onAttentionDrill('in_progress')}
            />
          ) : null}
          <DashboardKpiCard
            label={t('dashboard.upcomingDeadlines')}
            value={upcomingCount}
            tone="warning"
            active={attentionDrill === 'upcoming'}
            description={t('dashboard.drillHint')}
            onClick={() => onAttentionDrill('upcoming')}
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
            onClick={() => onAttentionDrill('phase_issues')}
          />
          <DashboardKpiCard
            label={t('dashboard.underfundedProjects')}
            value={underfundedCount}
            tone={underfundedCount > 0 ? 'warning' : 'default'}
            active={attentionDrill === 'underfunded'}
            description={t('dashboard.drillHint')}
            onClick={() => onAttentionDrill('underfunded')}
          />
          <DashboardKpiCard
            label={t('dashboard.overdueProcurement')}
            value={overdueProcurementCount}
            tone={overdueProcurementCount > 0 ? 'warning' : 'default'}
            active={attentionDrill === 'overdue_procurement'}
            description={t('dashboard.drillHint')}
            onClick={() => onAttentionDrill('overdue_procurement')}
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
              onSliceClick={onProjectStatusDrill}
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
              onSliceClick={onTaskStatusDrill}
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
                const path = resolveBlockedProjectPath(projectId)
                if (path) {
                  void navigate(path)
                }
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
                  onClick={() => onProgressDrill(range)}
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
              onClick={() => onAttentionDrill('phase_issues')}
            >
              {t('dashboard.viewPhaseIssues')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
