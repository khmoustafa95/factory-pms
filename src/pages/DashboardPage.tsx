import { useMemo, useRef, useState } from 'react'
import { DashboardAttentionSection } from '@/components/dashboard/DashboardAttentionSection'
import { DashboardProjectsPanel } from '@/components/dashboard/DashboardProjectsPanel'
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
import { PageHeader } from '@/components/PageHeader'
import { QueryState } from '@/components/QueryState'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/contexts/LocaleContext'
import { useDashboardInsights, useDashboardProjects, useDashboardStats } from '@/hooks/useDashboard'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatFactoryLabel, getRoleLabel } from '@/lib/i18n-format'
import { buildFactoryFilterOptions } from '@/lib/list-filters'
import {
  isCompanyDirector,
  isFactoryManager,
  isProjectManager,
} from '@/lib/roles'
import type { ProjectStatus } from '@/types/database'

export function DashboardPage() {
  const { t } = useTranslation()
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
  const debouncedProjectSearch = useDebouncedValue(projectSearch, 300)
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all')
  const [factoryFilter, setFactoryFilter] = useState('all')
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>('all')
  const [blockedFilter, setBlockedFilter] = useState<BlockedFilter>('all')
  const [taskActivityFilter, setTaskActivityFilter] =
    useState<TaskActivityFilter>('all')
  const [overdueFilter, setOverdueFilter] = useState<OverdueFilter>('all')
  const [phaseIssueFilter, setPhaseIssueFilter] =
    useState<PhaseIssueFilter>('all')
  const [underfundedFilter, setUnderfundedFilter] =
    useState<UnderfundedFilter>('all')
  const [overdueProcurementFilter, setOverdueProcurementFilter] =
    useState<OverdueProcurementFilter>('all')
  const [attentionDrill, setAttentionDrill] = useState<AttentionDrill>(null)

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
    setUnderfundedFilter('all')
    setOverdueProcurementFilter('all')
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
    } else if (drill === 'underfunded') {
      setUnderfundedFilter('underfunded')
    } else if (drill === 'overdue_procurement') {
      setOverdueProcurementFilter('overdue_procurement')
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
    const normalizedSearch = debouncedProjectSearch.trim().toLowerCase()

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

      if (underfundedFilter === 'underfunded' && !project.hasFundingGap) {
        return false
      }

      if (
        overdueProcurementFilter === 'overdue_procurement' &&
        project.overdueProcurementCount === 0
      ) {
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
    underfundedFilter,
    overdueProcurementFilter,
    progressFilter,
    debouncedProjectSearch,
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
    phaseIssueFilter !== 'all' ||
    underfundedFilter !== 'all' ||
    overdueProcurementFilter !== 'all'

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
          <DashboardAttentionSection
            stats={stats}
            insights={insights}
            isDirector={isDirector}
            isManager={isManager}
            isPm={isPm}
            attentionDrill={attentionDrill}
            statusFilter={statusFilter}
            blockedFilter={blockedFilter}
            taskActivityFilter={taskActivityFilter}
            progressFilter={progressFilter}
            onAttentionDrill={applyAttentionDrill}
            onProjectStatusDrill={applyProjectStatusDrill}
            onTaskStatusDrill={applyTaskStatusDrill}
            onProgressDrill={applyProgressDrill}
          />
        ) : null}
      </QueryState>

      <DashboardProjectsPanel
        sectionRef={projectDetailsRef}
        filteredProjects={filteredProjects}
        isLoading={isProjectsLoading}
        error={projectsError}
        isFetching={isProjectsFetching}
        onRetry={() => void refetchProjects()}
        isDirector={isDirector}
        hasActiveFilters={hasActiveProjectFilters}
        onClearFilters={resetListFilters}
        projectSearch={projectSearch}
        setProjectSearch={setProjectSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        progressFilter={progressFilter}
        setProgressFilter={setProgressFilter}
        blockedFilter={blockedFilter}
        setBlockedFilter={setBlockedFilter}
        overdueFilter={overdueFilter}
        setOverdueFilter={setOverdueFilter}
        phaseIssueFilter={phaseIssueFilter}
        setPhaseIssueFilter={setPhaseIssueFilter}
        taskActivityFilter={taskActivityFilter}
        setTaskActivityFilter={setTaskActivityFilter}
        factoryFilter={factoryFilter}
        setFactoryFilter={setFactoryFilter}
        factoryFilterOptions={factoryFilterOptions}
        setAttentionDrill={setAttentionDrill}
      />
    </section>
  )
}
