import { Link } from 'react-router-dom'
import { useMemo, type Dispatch, type RefObject, type SetStateAction } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import {
  PROJECT_STATUS_FILTERS,
  type AttentionDrill,
  type BlockedFilter,
  type OverdueFilter,
  type OverdueProcurementFilter,
  type PhaseIssueFilter,
  type ProgressFilter,
  type TaskActivityFilter,
  type UnderfundedFilter,
} from '@/components/dashboard/dashboard-types'
import { ActiveFilterChips } from '@/components/ActiveFilterChips'
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
  TableCell,
  TableHead,
  TableRow,
} from '@/components/ui/table'
import { VirtualizedTable } from '@/components/VirtualizedTable'
import { useTranslation } from '@/contexts/LocaleContext'
import type { DashboardProjectDetail } from '@/hooks/useDashboard'
import {
  formatFactoryLabel,
  formatLocalizedBudget,
  getProjectStatusLabel,
} from '@/lib/i18n-format'
import { formatProjectSchedule } from '@/lib/project-schedule'
import { formatProgress } from '@/lib/progress'
import { downloadSpreadsheet } from '@/lib/export-spreadsheet'
import { buildProjectPath } from '@/lib/project-routes'
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
  underfundedFilter: UnderfundedFilter
  setUnderfundedFilter: Dispatch<SetStateAction<UnderfundedFilter>>
  overdueProcurementFilter: OverdueProcurementFilter
  setOverdueProcurementFilter: Dispatch<SetStateAction<OverdueProcurementFilter>>
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
  underfundedFilter,
  setUnderfundedFilter,
  overdueProcurementFilter,
  setOverdueProcurementFilter,
  setAttentionDrill,
}: DashboardProjectsPanelProps) {
  const { t, locale } = useTranslation()
  const notAvailable = t('common.notAvailable')
  const columnCount = isDirector ? 12 : 11

  const factoryLabel =
    factoryFilterOptions.find((option) => option.value === factoryFilter)
      ?.label ?? factoryFilter

  const filterChips = useMemo(() => {
    const chips = []
    const trimmedSearch = projectSearch.trim()
    if (trimmedSearch) {
      chips.push({
        id: 'search',
        label: t('dashboard.filterChips.search', { query: trimmedSearch }),
        onRemove: () => setProjectSearch(''),
      })
    }
    if (statusFilter !== 'all') {
      chips.push({
        id: 'status',
        label: getProjectStatusLabel(t, statusFilter),
        onRemove: () => setStatusFilter('all'),
      })
    }
    if (factoryFilter !== 'all') {
      chips.push({
        id: 'factory',
        label: t('dashboard.filterChips.factory', { name: factoryLabel }),
        onRemove: () => setFactoryFilter('all'),
      })
    }
    if (blockedFilter === 'blocked') {
      chips.push({
        id: 'blocked',
        label: t('dashboard.filterBlockedOnly'),
        onRemove: () => setBlockedFilter('all'),
      })
    }
    if (overdueFilter === 'overdue') {
      chips.push({
        id: 'overdue',
        label: t('dashboard.filterOverdueOnly'),
        onRemove: () => setOverdueFilter('all'),
      })
    }
    if (phaseIssueFilter === 'phase_issues') {
      chips.push({
        id: 'phaseIssues',
        label: t('dashboard.filterPhaseIssuesOnly'),
        onRemove: () => setPhaseIssueFilter('all'),
      })
    }
    if (progressFilter !== 'all') {
      chips.push({
        id: 'progress',
        label: `${progressFilter}%`,
        onRemove: () => setProgressFilter('all'),
      })
    }
    if (taskActivityFilter !== 'all') {
      chips.push({
        id: 'taskActivity',
        label: t(`taskStatus.${taskActivityFilter}`),
        onRemove: () => setTaskActivityFilter('all'),
      })
    }
    if (underfundedFilter === 'underfunded') {
      chips.push({
        id: 'underfunded',
        label: t('dashboard.filterChips.underfunded'),
        onRemove: () => setUnderfundedFilter('all'),
      })
    }
    if (overdueProcurementFilter === 'overdue_procurement') {
      chips.push({
        id: 'overdueProcurement',
        label: t('dashboard.filterChips.overdueProcurement'),
        onRemove: () => setOverdueProcurementFilter('all'),
      })
    }
    return chips
  }, [
    blockedFilter,
    factoryFilter,
    factoryLabel,
    overdueFilter,
    overdueProcurementFilter,
    phaseIssueFilter,
    progressFilter,
    projectSearch,
    setBlockedFilter,
    setFactoryFilter,
    setOverdueFilter,
    setOverdueProcurementFilter,
    setPhaseIssueFilter,
    setProgressFilter,
    setProjectSearch,
    setStatusFilter,
    setTaskActivityFilter,
    setUnderfundedFilter,
    statusFilter,
    t,
    taskActivityFilter,
    underfundedFilter,
  ])

  const handleExport = () => {
    if (filteredProjects.length === 0) {
      toast.error(t('list.exportEmpty'))
      return
    }

    try {
      downloadSpreadsheet(
        `projects-${new Date().toISOString().slice(0, 10)}`,
        [
          { header: t('common.title'), value: (row) => row.title },
          ...(isDirector
            ? [
                {
                  header: t('common.factory'),
                  value: (row: DashboardProjectDetail) =>
                    row.factory ? formatFactoryLabel(row.factory) : '',
                },
              ]
            : []),
          {
            header: t('common.status'),
            value: (row: DashboardProjectDetail) =>
              getProjectStatusLabel(t, row.status),
          },
          {
            header: t('common.progress'),
            value: (row: DashboardProjectDetail) =>
              formatProgress(row.progressPercent),
          },
          {
            header: t('common.budget'),
            value: (row: DashboardProjectDetail) =>
              formatLocalizedBudget(
                row.budget,
                row.currency,
                locale,
                notAvailable,
              ),
          },
          {
            header: t('common.timeline'),
            value: (row: DashboardProjectDetail) =>
              formatProjectSchedule(
                {
                  proposed_start_date: row.proposedStartDate,
                  proposed_end_date: row.proposedEndDate,
                  proposed_duration_value: row.proposedDurationValue,
                  proposed_duration_unit: row.proposedDurationUnit,
                  actual_start_date: row.actualStartDate,
                  actual_end_date: row.actualEndDate,
                },
                locale,
                t,
                notAvailable,
              ),
          },
          {
            header: t('dashboard.tasksDone'),
            value: (row: DashboardProjectDetail) => row.doneTaskCount,
          },
          {
            header: t('dashboard.tasksInProgress'),
            value: (row: DashboardProjectDetail) => row.inProgressTaskCount,
          },
          {
            header: t('dashboard.overdueTasks'),
            value: (row: DashboardProjectDetail) => row.overdueTaskCount,
          },
          {
            header: t('dashboard.blockedTasks'),
            value: (row: DashboardProjectDetail) => row.blockedTaskCount,
          },
          {
            header: t('dashboard.phaseIssues'),
            value: (row: DashboardProjectDetail) =>
              row.hasPhaseIssue
                ? row.overduePhaseCount > 0
                  ? String(row.overduePhaseCount)
                  : t('dashboard.phaseIssueFlag')
                : '',
          },
          {
            header: t('dashboard.tasksTotal'),
            value: (row: DashboardProjectDetail) => row.totalTaskCount,
          },
        ],
        filteredProjects,
      )
      toast.success(t('list.exported'))
    } catch {
      toast.error(t('list.exportFailed'))
    }
  }

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
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
            <div className="space-y-1.5">
              <CardTitle>{t('dashboard.projectDetailsTitle')}</CardTitle>
              <CardDescription>
                {t('dashboard.projectDetailsDescription')}
              </CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleExport}
            >
              <Download className="size-4" />
              {t('list.exportExcel')}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <ActiveFilterChips
              chips={filterChips}
              onClearAll={hasActiveFilters ? onClearFilters : undefined}
            />

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

            <VirtualizedTable
              rowCount={filteredProjects.length}
              colSpan={columnCount}
              header={
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
              }
              empty={
                <TableRow>
                  <TableCell
                    colSpan={columnCount}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {hasActiveFilters
                      ? t('list.noResults')
                      : t('dashboard.noProjectDetails')}
                  </TableCell>
                </TableRow>
              }
              renderRow={(index) => {
                const project = filteredProjects[index]
                return (
                  <>
                    <TableCell className="font-medium">
                      <Link
                        className="hover:underline"
                        to={buildProjectPath({
                          code: project.code,
                          factories: project.factory
                            ? { code: project.factory.code }
                            : null,
                        })}
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
                  </>
                )
              }}
            />
          </CardContent>
        </Card>
      </QueryState>
    </div>
  )
}
