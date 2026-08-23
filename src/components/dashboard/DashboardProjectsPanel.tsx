import { Link } from 'react-router-dom'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import {
  PROJECT_STATUS_FILTERS,
  type AttentionDrill,
  type BlockedFilter,
  type OverdueFilter,
  type PhaseIssueFilter,
  type ProgressFilter,
  type TaskActivityFilter,
} from '@/components/dashboard/dashboard-types'
import { ListToolbar } from '@/components/ListToolbar'
import { ProjectStatusBadge } from '@/components/projects/ProjectStatusBadge'
import { QueryState } from '@/components/QueryState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useTranslation } from '@/contexts/LocaleContext'
import type { DashboardProjectDetail } from '@/hooks/useDashboard'
import {
  formatFactoryLabel,
  formatLocalizedBudget,
  getProjectStatusLabel,
} from '@/lib/i18n-format'
import { formatProjectSchedule } from '@/lib/project-schedule'
import { formatProgress } from '@/lib/progress'
import type { ProjectStatus } from '@/types/database'

type FilterOption = { value: string; label: string }

type DashboardProjectsPanelProps = {
  sectionRef: RefObject<HTMLDivElement | null>
  filteredProjects: DashboardProjectDetail[]
  isLoading: boolean
  error: unknown
  isFetching: boolean
  onRetry: () => void
  isDirector: boolean
  hasActiveFilters: boolean
  onClearFilters: () => void
  projectSearch: string
  setProjectSearch: Dispatch<SetStateAction<string>>
  statusFilter: 'all' | ProjectStatus
  setStatusFilter: Dispatch<SetStateAction<'all' | ProjectStatus>>
  progressFilter: ProgressFilter
  setProgressFilter: Dispatch<SetStateAction<ProgressFilter>>
  blockedFilter: BlockedFilter
  setBlockedFilter: Dispatch<SetStateAction<BlockedFilter>>
  overdueFilter: OverdueFilter
  setOverdueFilter: Dispatch<SetStateAction<OverdueFilter>>
  phaseIssueFilter: PhaseIssueFilter
  setPhaseIssueFilter: Dispatch<SetStateAction<PhaseIssueFilter>>
  taskActivityFilter: TaskActivityFilter
  setTaskActivityFilter: Dispatch<SetStateAction<TaskActivityFilter>>
  factoryFilter: string
  setFactoryFilter: Dispatch<SetStateAction<string>>
  factoryFilterOptions: FilterOption[]
  setAttentionDrill: Dispatch<SetStateAction<AttentionDrill>>
}

export function DashboardProjectsPanel({
  sectionRef,
  filteredProjects,
  isLoading,
  error,
  isFetching,
  onRetry,
  isDirector,
  hasActiveFilters,
  onClearFilters,
  projectSearch,
  setProjectSearch,
  statusFilter,
  setStatusFilter,
  progressFilter,
  setProgressFilter,
  blockedFilter,
  setBlockedFilter,
  overdueFilter,
  setOverdueFilter,
  phaseIssueFilter,
  setPhaseIssueFilter,
  taskActivityFilter,
  setTaskActivityFilter,
  factoryFilter,
  setFactoryFilter,
  factoryFilterOptions,
  setAttentionDrill,
}: DashboardProjectsPanelProps) {
  const { t, locale } = useTranslation()
  const notAvailable = t('common.notAvailable')

  return (
    <div ref={sectionRef} className="space-y-3 border-t border-border/60 pt-6">
      <div>
        <h2 className="text-base font-medium">{t('dashboard.exploreTitle')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('dashboard.exploreDescription')}
        </p>
      </div>

      <QueryState
        isLoading={isLoading}
        error={error}
        loadingMessage={t('dashboard.loading')}
        errorMessage={t('dashboard.loadFailed')}
        onRetry={onRetry}
        isRetrying={isFetching}
      >
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.projectDetailsTitle')}</CardTitle>
            <CardDescription>
              {t('dashboard.projectDetailsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasActiveFilters ? (
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
                <Button size="sm" variant="ghost" onClick={onClearFilters}>
                  {t('list.clearFilters')}
                </Button>
              </div>
            ) : null}

            <ListToolbar
              search={projectSearch}
              onSearchChange={setProjectSearch}
              searchPlaceholder={t('dashboard.projectDetailsSearch')}
              hasActiveFilters={hasActiveFilters}
              onClear={onClearFilters}
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
                            <Badge variant="secondary" className="tabular-nums">
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
                        {hasActiveFilters
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
  )
}
