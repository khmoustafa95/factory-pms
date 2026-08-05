import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import type { DurationUnit, ProjectStatus, TaskStatus } from '@/types/database'

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

function createCountMap<T extends string>(keys: readonly T[]): StatusCount<T> {
  const map = {} as StatusCount<T>
  for (const key of keys) {
    map[key] = 0
  }
  return map
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function isPhaseOverdue(
  phase: {
    status: string
    end_date: string | null
  },
  todayIso: string,
): boolean {
  return (
    phase.status !== 'completed' &&
    phase.end_date != null &&
    phase.end_date < todayIso
  )
}

function hasScheduleDeviation(
  phase: {
    status: string
    end_date: string | null
    actual_end_date: string | null
    schedule_deviation_reason: string | null
  },
  todayIso: string,
): boolean {
  if (phase.schedule_deviation_reason) {
    return true
  }
  if (
    phase.actual_end_date &&
    phase.end_date &&
    phase.actual_end_date > phase.end_date
  ) {
    return true
  }
  return isPhaseOverdue(phase, todayIso)
}

function hasFinancialDeviation(phase: {
  expected_budget: number
  actual_budget: number | null
  financial_deviation_reason: string | null
}): boolean {
  if (phase.financial_deviation_reason) {
    return true
  }
  if (phase.actual_budget == null) {
    return false
  }
  return Number(phase.actual_budget) > Number(phase.expected_budget) + 0.009
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
      const todayIso = todayIsoDate()
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10)

      const [
        projectsResult,
        tasksResult,
        blockedByProjectResult,
        phasesResult,
      ] = await Promise.all([
        supabase.from('projects').select('id, title, status, progress_percent'),
        supabase.from('tasks').select('id, status, due_date'),
        supabase
          .from('tasks')
          .select('project_id, projects(title)')
          .eq('status', 'blocked'),
        supabase
          .from('phases')
          .select(
            'id, project_id, status, end_date, actual_end_date, expected_budget, actual_budget, schedule_deviation_reason, financial_deviation_reason',
          ),
      ])

      if (projectsResult.error) {
        throw projectsResult.error
      }
      if (tasksResult.error) {
        throw tasksResult.error
      }
      if (blockedByProjectResult.error) {
        throw blockedByProjectResult.error
      }
      if (phasesResult.error) {
        throw phasesResult.error
      }

      const projectStatusCounts = createCountMap(PROJECT_STATUSES)
      const taskStatusCounts = createCountMap(TASK_STATUSES)

      for (const project of projectsResult.data) {
        projectStatusCounts[project.status] += 1
      }

      let overdueTaskCount = 0
      let upcomingDueTaskCount = 0

      for (const task of tasksResult.data) {
        taskStatusCounts[task.status] += 1

        if (!task.due_date || task.status === 'done') {
          continue
        }

        if (task.due_date < todayIso) {
          overdueTaskCount += 1
          continue
        }

        if (task.due_date <= sevenDaysFromNow) {
          upcomingDueTaskCount += 1
        }
      }

      const progressBuckets = [
        { label: '0-24', min: 0, max: 24, count: 0 },
        { label: '25-49', min: 25, max: 49, count: 0 },
        { label: '50-74', min: 50, max: 74, count: 0 },
        { label: '75-99', min: 75, max: 99, count: 0 },
        { label: '100', min: 100, max: 100, count: 0 },
      ]

      for (const project of projectsResult.data) {
        const value = Math.max(
          0,
          Math.min(100, Math.round(Number(project.progress_percent))),
        )
        const bucket = progressBuckets.find(
          (candidate) => value >= candidate.min && value <= candidate.max,
        )
        if (bucket) {
          bucket.count += 1
        }
      }

      const blockedByProjectMap = new Map<
        string,
        { projectTitle: string; blockedTaskCount: number }
      >()

      for (const row of blockedByProjectResult.data) {
        const projectId = row.project_id
        if (!projectId) {
          continue
        }

        const relation = row.projects
        const projectTitle =
          typeof relation === 'object' &&
          relation !== null &&
          'title' in relation &&
          typeof relation.title === 'string'
            ? relation.title
            : '—'

        const current = blockedByProjectMap.get(projectId)
        if (current) {
          current.blockedTaskCount += 1
          continue
        }

        blockedByProjectMap.set(projectId, {
          projectTitle,
          blockedTaskCount: 1,
        })
      }

      const topBlockedProjects = Array.from(blockedByProjectMap.entries())
        .map(([projectId, value]) => ({
          projectId,
          projectTitle: value.projectTitle,
          blockedTaskCount: value.blockedTaskCount,
        }))
        .sort((left, right) => right.blockedTaskCount - left.blockedTaskCount)
        .slice(0, 5)

      let overduePhaseCount = 0
      let scheduleDeviationPhaseCount = 0
      let financialDeviationPhaseCount = 0
      const phaseIssueIds = new Set<string>()

      for (const phase of phasesResult.data) {
        const overdue = isPhaseOverdue(phase, todayIso)
        const schedule = hasScheduleDeviation(phase, todayIso)
        const financial = hasFinancialDeviation(phase)

        if (overdue) {
          overduePhaseCount += 1
        }
        if (schedule) {
          scheduleDeviationPhaseCount += 1
        }
        if (financial) {
          financialDeviationPhaseCount += 1
        }
        if (overdue || schedule || financial) {
          phaseIssueIds.add(phase.id)
        }
      }

      return {
        totalProjects: projectsResult.data.length,
        totalTasks: tasksResult.data.length,
        overdueTaskCount,
        upcomingDueTaskCount,
        proposedCount: projectStatusCounts.proposed,
        overduePhaseCount,
        scheduleDeviationPhaseCount,
        financialDeviationPhaseCount,
        phaseIssueCount: phaseIssueIds.size,
        projectStatusCounts,
        taskStatusCounts,
        progressBuckets,
        topBlockedProjects,
      }
    },
  })
}

type RawProjectFactoryRelation =
  | {
      id: string
      name: string
      code: string
    }
  | Array<{
      id: string
      name: string
      code: string
    }>
  | null

function normalizeFactory(
  value: RawProjectFactoryRelation,
): DashboardProjectDetail['factory'] {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }
  return value
}

export function useDashboardProjects() {
  return useQuery({
    queryKey: queryKeys.dashboardProjects,
    queryFn: async (): Promise<DashboardProjectDetail[]> => {
      const supabase = getSupabase()
      const todayIso = todayIsoDate()

      const [projectsResult, tasksResult, phasesResult] = await Promise.all([
        supabase
          .from('projects')
          .select(
            'id, title, status, progress_percent, budget, currency, proposed_start_date, proposed_end_date, proposed_duration_value, proposed_duration_unit, actual_start_date, actual_end_date, factory_id, factories(id, name, code)',
          )
          .order('updated_at', { ascending: false }),
        supabase.from('tasks').select('project_id, status, due_date'),
        supabase
          .from('phases')
          .select(
            'id, project_id, status, end_date, actual_end_date, expected_budget, actual_budget, schedule_deviation_reason, financial_deviation_reason',
          ),
      ])

      if (projectsResult.error) {
        throw projectsResult.error
      }

      if (tasksResult.error) {
        throw tasksResult.error
      }

      if (phasesResult.error) {
        throw phasesResult.error
      }

      const taskCountsByProject = new Map<
        string,
        {
          totalTaskCount: number
          todoTaskCount: number
          inProgressTaskCount: number
          doneTaskCount: number
          blockedTaskCount: number
          overdueTaskCount: number
        }
      >()

      for (const row of tasksResult.data) {
        if (!row.project_id) {
          continue
        }

        const current = taskCountsByProject.get(row.project_id) ?? {
          totalTaskCount: 0,
          todoTaskCount: 0,
          inProgressTaskCount: 0,
          doneTaskCount: 0,
          blockedTaskCount: 0,
          overdueTaskCount: 0,
        }

        current.totalTaskCount += 1
        if (row.status === 'todo') {
          current.todoTaskCount += 1
        }
        if (row.status === 'in_progress') {
          current.inProgressTaskCount += 1
        }
        if (row.status === 'done') {
          current.doneTaskCount += 1
        }
        if (row.status === 'blocked') {
          current.blockedTaskCount += 1
        }
        if (row.due_date && row.status !== 'done' && row.due_date < todayIso) {
          current.overdueTaskCount += 1
        }

        taskCountsByProject.set(row.project_id, current)
      }

      const phaseSignalsByProject = new Map<
        string,
        { overduePhaseCount: number; hasPhaseIssue: boolean }
      >()

      for (const phase of phasesResult.data) {
        if (!phase.project_id) {
          continue
        }

        const current = phaseSignalsByProject.get(phase.project_id) ?? {
          overduePhaseCount: 0,
          hasPhaseIssue: false,
        }

        const overdue = isPhaseOverdue(phase, todayIso)
        const issue =
          overdue ||
          hasScheduleDeviation(phase, todayIso) ||
          hasFinancialDeviation(phase)

        if (overdue) {
          current.overduePhaseCount += 1
        }
        if (issue) {
          current.hasPhaseIssue = true
        }

        phaseSignalsByProject.set(phase.project_id, current)
      }

      return projectsResult.data.map((project) => {
        const taskCounts = taskCountsByProject.get(project.id)
        const phaseSignals = phaseSignalsByProject.get(project.id)
        return {
          id: project.id,
          title: project.title,
          status: project.status,
          progressPercent: Number(project.progress_percent),
          budget: project.budget,
          currency: project.currency,
          proposedStartDate: project.proposed_start_date,
          proposedEndDate: project.proposed_end_date,
          proposedDurationValue: project.proposed_duration_value,
          proposedDurationUnit: project.proposed_duration_unit,
          actualStartDate: project.actual_start_date,
          actualEndDate: project.actual_end_date,
          factory: normalizeFactory(
            project.factories as RawProjectFactoryRelation,
          ),
          totalTaskCount: taskCounts?.totalTaskCount ?? 0,
          todoTaskCount: taskCounts?.todoTaskCount ?? 0,
          inProgressTaskCount: taskCounts?.inProgressTaskCount ?? 0,
          doneTaskCount: taskCounts?.doneTaskCount ?? 0,
          blockedTaskCount: taskCounts?.blockedTaskCount ?? 0,
          overdueTaskCount: taskCounts?.overdueTaskCount ?? 0,
          overduePhaseCount: phaseSignals?.overduePhaseCount ?? 0,
          hasPhaseIssue: phaseSignals?.hasPhaseIssue ?? false,
        }
      })
    },
  })
}
