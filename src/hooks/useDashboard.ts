import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import type {
  DurationUnit,
  Json,
  ProjectStatus,
  TaskStatus,
} from '@/types/database'

export type DashboardStats = {
  factoryCount: number
  activeProjectCount: number
  averageProgress: number
  blockedTaskCount: number
  draftCount: number
  proposedCount: number
  inProgressCount: number
  overdueTaskCount: number
}

type StatusCount<T extends string> = Record<T, number>

export type DashboardInsights = {
  totalProjects: number
  totalTasks: number
  overdueTaskCount: number
  upcomingDueTaskCount: number
  proposedCount: number
  overduePhaseCount: number
  scheduleDeviationPhaseCount: number
  financialDeviationPhaseCount: number
  phaseIssueCount: number
  underfundedProjectCount: number
  overdueProcurementCount: number
  projectStatusCounts: StatusCount<ProjectStatus>
  taskStatusCounts: StatusCount<TaskStatus>
  progressBuckets: Array<{
    label: string
    min: number
    max: number
    count: number
  }>
  topBlockedProjects: Array<{
    projectId: string
    projectTitle: string
    blockedTaskCount: number
  }>
}

export type DashboardProjectDetail = {
  id: string
  title: string
  status: ProjectStatus
  progressPercent: number
  budget: number | null
  currency: string
  proposedStartDate: string | null
  proposedEndDate: string | null
  proposedDurationValue: number | null
  proposedDurationUnit: DurationUnit | null
  actualStartDate: string | null
  actualEndDate: string | null
  factory: {
    id: string
    name: string
    code: string
  } | null
  totalTaskCount: number
  todoTaskCount: number
  inProgressTaskCount: number
  doneTaskCount: number
  blockedTaskCount: number
  overdueTaskCount: number
  overduePhaseCount: number
  hasPhaseIssue: boolean
  fundingReceived: number
  budgetUsedPct: number | null
  hasFundingGap: boolean
  openProcurementCount: number
  overdueProcurementCount: number
}

const PROJECT_STATUSES: ProjectStatus[] = [
  'draft',
  'proposed',
  'approved',
  'rejected',
  'in_progress',
  'completed',
  'paused',
]

const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'done']

const EMPTY_PROGRESS_BUCKETS: DashboardInsights['progressBuckets'] = [
  { label: '0-24', min: 0, max: 24, count: 0 },
  { label: '25-49', min: 25, max: 49, count: 0 },
  { label: '50-74', min: 50, max: 74, count: 0 },
  { label: '75-99', min: 75, max: 99, count: 0 },
  { label: '100', min: 100, max: 100, count: 0 },
]

function createCountMap<T extends string>(keys: readonly T[]): StatusCount<T> {
  const map = {} as StatusCount<T>
  for (const key of keys) {
    map[key] = 0
  }
  return map
}

function isRecord(value: Json | undefined): value is { [key: string]: Json } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readStatusCounts<T extends string>(
  value: Json | undefined,
  keys: readonly T[],
): StatusCount<T> {
  const counts = createCountMap(keys)
  if (!isRecord(value)) {
    return counts
  }
  for (const key of keys) {
    const raw = value[key]
    counts[key] = typeof raw === 'number' ? raw : Number(raw ?? 0)
  }
  return counts
}

function readProgressBuckets(
  value: Json | undefined,
): DashboardInsights['progressBuckets'] {
  if (!Array.isArray(value)) {
    return EMPTY_PROGRESS_BUCKETS.map((bucket) => ({ ...bucket }))
  }

  return EMPTY_PROGRESS_BUCKETS.map((fallback) => {
    const match = value.find(
      (item) =>
        isRecord(item) &&
        typeof item.label === 'string' &&
        item.label === fallback.label,
    )
    if (!isRecord(match)) {
      return { ...fallback }
    }
    return {
      label: fallback.label,
      min: typeof match.min === 'number' ? match.min : fallback.min,
      max: typeof match.max === 'number' ? match.max : fallback.max,
      count:
        typeof match.count === 'number'
          ? match.count
          : Number(match.count ?? 0),
    }
  })
}

function readTopBlockedProjects(
  value: Json | undefined,
): DashboardInsights['topBlockedProjects'] {
  if (!Array.isArray(value)) {
    return []
  }

  const rows: DashboardInsights['topBlockedProjects'] = []
  for (const item of value) {
    if (!isRecord(item)) {
      continue
    }
    const projectId = item.projectId
    const projectTitle = item.projectTitle
    if (typeof projectId !== 'string' || typeof projectTitle !== 'string') {
      continue
    }
    rows.push({
      projectId,
      projectTitle,
      blockedTaskCount:
        typeof item.blockedTaskCount === 'number'
          ? item.blockedTaskCount
          : Number(item.blockedTaskCount ?? 0),
    })
  }
  return rows
}

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async (): Promise<DashboardStats> => {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('get_dashboard_stats')

      if (error) {
        throw error
      }

      const row = data?.[0]
      if (!row) {
        return {
          factoryCount: 0,
          activeProjectCount: 0,
          averageProgress: 0,
          blockedTaskCount: 0,
          draftCount: 0,
          proposedCount: 0,
          inProgressCount: 0,
          overdueTaskCount: 0,
        }
      }

      return {
        factoryCount: Number(row.factory_count),
        activeProjectCount: Number(row.active_project_count),
        averageProgress: Number(row.average_progress),
        blockedTaskCount: Number(row.blocked_task_count),
        draftCount: Number(row.draft_count),
        proposedCount: Number(row.proposed_count),
        inProgressCount: Number(row.in_progress_count),
        overdueTaskCount: Number(row.overdue_task_count),
      }
    },
  })
}

export function useDashboardInsights() {
  return useQuery({
    queryKey: queryKeys.dashboardInsights,
    queryFn: async (): Promise<DashboardInsights> => {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('get_dashboard_insights')

      if (error) {
        throw error
      }

      const row = data?.[0]
      if (!row) {
        return {
          totalProjects: 0,
          totalTasks: 0,
          overdueTaskCount: 0,
          upcomingDueTaskCount: 0,
          proposedCount: 0,
          overduePhaseCount: 0,
          scheduleDeviationPhaseCount: 0,
          financialDeviationPhaseCount: 0,
          phaseIssueCount: 0,
          underfundedProjectCount: 0,
          overdueProcurementCount: 0,
          projectStatusCounts: createCountMap(PROJECT_STATUSES),
          taskStatusCounts: createCountMap(TASK_STATUSES),
          progressBuckets: EMPTY_PROGRESS_BUCKETS.map((bucket) => ({
            ...bucket,
          })),
          topBlockedProjects: [],
        }
      }

      return {
        totalProjects: Number(row.total_projects),
        totalTasks: Number(row.total_tasks),
        overdueTaskCount: Number(row.overdue_task_count),
        upcomingDueTaskCount: Number(row.upcoming_due_task_count),
        proposedCount: Number(row.proposed_count),
        overduePhaseCount: Number(row.overdue_phase_count),
        scheduleDeviationPhaseCount: Number(row.schedule_deviation_phase_count),
        financialDeviationPhaseCount: Number(
          row.financial_deviation_phase_count,
        ),
        phaseIssueCount: Number(row.phase_issue_count),
        underfundedProjectCount: Number(row.underfunded_project_count),
        overdueProcurementCount: Number(row.overdue_procurement_count),
        projectStatusCounts: readStatusCounts(
          row.project_status_counts,
          PROJECT_STATUSES,
        ),
        taskStatusCounts: readStatusCounts(
          row.task_status_counts,
          TASK_STATUSES,
        ),
        progressBuckets: readProgressBuckets(row.progress_buckets),
        topBlockedProjects: readTopBlockedProjects(row.top_blocked_projects),
      }
    },
  })
}

export function useDashboardProjects() {
  return useQuery({
    queryKey: queryKeys.dashboardProjects,
    queryFn: async (): Promise<DashboardProjectDetail[]> => {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('get_dashboard_projects')

      if (error) {
        throw error
      }

      return (data ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        status: row.status,
        progressPercent: Number(row.progress_percent),
        budget: row.budget,
        currency: row.currency,
        proposedStartDate: row.proposed_start_date,
        proposedEndDate: row.proposed_end_date,
        proposedDurationValue: row.proposed_duration_value,
        proposedDurationUnit: row.proposed_duration_unit,
        actualStartDate: row.actual_start_date,
        actualEndDate: row.actual_end_date,
        factory:
          row.factory_id && row.factory_name && row.factory_code
            ? {
                id: row.factory_id,
                name: row.factory_name,
                code: row.factory_code,
              }
            : null,
        totalTaskCount: Number(row.total_task_count),
        todoTaskCount: Number(row.todo_task_count),
        inProgressTaskCount: Number(row.in_progress_task_count),
        doneTaskCount: Number(row.done_task_count),
        blockedTaskCount: Number(row.blocked_task_count),
        overdueTaskCount: Number(row.overdue_task_count),
        overduePhaseCount: Number(row.overdue_phase_count),
        hasPhaseIssue: Boolean(row.has_phase_issue),
        fundingReceived: Number(row.funding_received),
        budgetUsedPct:
          row.budget_used_pct != null ? Number(row.budget_used_pct) : null,
        hasFundingGap: Boolean(row.has_funding_gap),
        openProcurementCount: Number(row.open_procurement_count),
        overdueProcurementCount: Number(row.overdue_procurement_count),
      }))
    },
  })
}
