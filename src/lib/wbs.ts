import type { Profile, Project, ProjectStatus, Phase } from '@/types/database'
import {
  isCompanyDirector,
  isFactoryManager,
  isProjectManager,
} from '@/lib/roles'
import { getPhaseDurationDays } from '@/lib/duration'
import { getProjectScheduleBounds } from '@/lib/duration'

export const WBS_VIEW_STATUSES: ProjectStatus[] = [
  'approved',
  'in_progress',
  'paused',
  'completed',
]

export const PHASE_MANAGE_STATUSES: ProjectStatus[] = [
  'approved',
  'in_progress',
  'paused',
]

export const TASK_MANAGE_STATUSES: ProjectStatus[] = ['in_progress', 'paused']

export const WBS_MANAGE_STATUSES = PHASE_MANAGE_STATUSES

export function canViewWbs(status: ProjectStatus): boolean {
  return WBS_VIEW_STATUSES.includes(status)
}

function isAssignedProjectManager(
  project: Pick<Project, 'assigned_pm_id'>,
  profile: Pick<Profile, 'id' | 'role'> | null | undefined,
): boolean {
  return (
    Boolean(profile) &&
    isProjectManager(profile?.role) &&
    project.assigned_pm_id === profile?.id
  )
}

function canAccessProjectWbs(
  project: Pick<Project, 'status' | 'assigned_pm_id'>,
  profile: Pick<Profile, 'id' | 'role'> | null | undefined,
  statuses: ProjectStatus[],
): boolean {
  if (!profile || !statuses.includes(project.status)) {
    return false
  }

  return isAssignedProjectManager(project, profile)
}

export function canGovernExecution(
  project: Pick<Project, 'factory_id'>,
  profile: Pick<Profile, 'id' | 'role' | 'factory_id'> | null | undefined,
): boolean {
  if (!profile) {
    return false
  }

  if (isCompanyDirector(profile.role)) {
    return true
  }

  return (
    isFactoryManager(profile.role) &&
    profile.factory_id != null &&
    profile.factory_id === project.factory_id
  )
}

export function canConfirmCompletion(
  profile: Pick<Profile, 'role'> | null | undefined,
): boolean {
  return Boolean(profile && isCompanyDirector(profile.role))
}

export function canRequestCompletion(
  project: Pick<Project, 'status' | 'factory_id'>,
  profile: Pick<Profile, 'id' | 'role' | 'factory_id'> | null | undefined,
): boolean {
  if (!profile || !['in_progress', 'paused'].includes(project.status)) {
    return false
  }

  return (
    isFactoryManager(profile.role) &&
    profile.factory_id != null &&
    profile.factory_id === project.factory_id
  )
}

/** @deprecated Prefer canManagePhases / canManageTasks */
export function canManageWbs(
  project: Pick<Project, 'status' | 'assigned_pm_id'>,
  profile: Pick<Profile, 'id' | 'role'> | null | undefined,
): boolean {
  return canAccessProjectWbs(project, profile, PHASE_MANAGE_STATUSES)
}

export function canManagePhases(
  project: Pick<Project, 'status' | 'assigned_pm_id'>,
  profile: Pick<Profile, 'id' | 'role'> | null | undefined,
): boolean {
  return canAccessProjectWbs(project, profile, PHASE_MANAGE_STATUSES)
}

export function canManageTasks(
  project: Pick<Project, 'status' | 'assigned_pm_id'>,
  profile: Pick<Profile, 'id' | 'role'> | null | undefined,
): boolean {
  return canAccessProjectWbs(project, profile, TASK_MANAGE_STATUSES)
}

export function canStartExecution(
  project: Pick<Project, 'status' | 'factory_id'>,
  profile: Pick<Profile, 'id' | 'role' | 'factory_id'> | null | undefined,
): boolean {
  if (!profile || project.status !== 'approved') {
    return false
  }

  return (
    isFactoryManager(profile.role) &&
    profile.factory_id != null &&
    profile.factory_id === project.factory_id
  )
}

export function canReassignProjectPm(
  project: Pick<Project, 'status' | 'factory_id'>,
  profile: Pick<Profile, 'id' | 'role' | 'factory_id'> | null | undefined,
): boolean {
  if (
    !profile ||
    !['approved', 'in_progress', 'paused'].includes(project.status)
  ) {
    return false
  }

  return (
    isFactoryManager(profile.role) &&
    profile.factory_id != null &&
    profile.factory_id === project.factory_id
  )
}

export function sumPhaseWeights(
  phases: Array<{ weight_percent: number }>,
): number {
  return phases.reduce((sum, phase) => sum + Number(phase.weight_percent), 0)
}

export function isPhaseWeightSumValid(
  phases: Array<{ weight_percent: number }>,
): boolean {
  if (phases.length === 0) {
    return false
  }

  return Math.abs(sumPhaseWeights(phases) - 100) < 0.01
}

export function sumPhaseExpectedBudgets(
  phases: Array<{ expected_budget: number }>,
): number {
  return phases.reduce((sum, phase) => sum + Number(phase.expected_budget), 0)
}

export function remainingPhaseBudget(
  projectBudget: number | null | undefined,
  phases: Array<{ id?: string; expected_budget: number }>,
  excludePhaseId?: string,
): number {
  if (projectBudget == null || projectBudget <= 0) {
    return 0
  }

  const used = phases.reduce((sum, phase) => {
    if (excludePhaseId && phase.id === excludePhaseId) {
      return sum
    }
    return sum + Number(phase.expected_budget)
  }, 0)

  return Math.max(0, Number(projectBudget) - used)
}

export function isPhaseBudgetSumValid(
  projectBudget: number | null | undefined,
  phases: Array<{ expected_budget: number }>,
): boolean {
  if (projectBudget == null || projectBudget <= 0 || phases.length === 0) {
    return false
  }

  return (
    Math.abs(sumPhaseExpectedBudgets(phases) - Number(projectBudget)) < 0.01
  )
}

export type ExecutionReadinessReason =
  | 'not_approved'
  | 'no_phases'
  | 'weights_incomplete'
  | 'budgets_incomplete'
  | 'missing_dates'
  | 'dates_outside_project'
  | 'phase_budget_exceeds_project'
  | 'missing_project_budget'
  | 'missing_project_schedule'

export interface ExecutionReadiness {
  ready: boolean
  reasons: ExecutionReadinessReason[]
}

export function getExecutionReadiness(
  project: Pick<
    Project,
    | 'status'
    | 'budget'
    | 'proposed_start_date'
    | 'proposed_end_date'
    | 'proposed_duration_value'
    | 'proposed_duration_unit'
    | 'actual_start_date'
    | 'actual_end_date'
  >,
  phases: Array<
    Pick<
      Phase,
      'start_date' | 'end_date' | 'weight_percent' | 'expected_budget'
    >
  >,
): ExecutionReadiness {
  const reasons: ExecutionReadinessReason[] = []

  if (project.status !== 'approved') {
    reasons.push('not_approved')
  }

  if (project.budget == null || Number(project.budget) <= 0) {
    reasons.push('missing_project_budget')
  }

  const schedule = getProjectScheduleBounds(project)
  if (!schedule.start || !schedule.end) {
    reasons.push('missing_project_schedule')
  }

  if (phases.length === 0) {
    reasons.push('no_phases')
  }

  if (phases.length > 0 && !isPhaseWeightSumValid(phases)) {
    reasons.push('weights_incomplete')
  }

  if (phases.length > 0 && !isPhaseBudgetSumValid(project.budget, phases)) {
    reasons.push('budgets_incomplete')
  }

  const missingDates = phases.some(
    (phase) => !phase.start_date || !phase.end_date,
  )
  if (phases.length > 0 && missingDates) {
    reasons.push('missing_dates')
  }

  if (schedule.start && schedule.end) {
    const outside = phases.some(
      (phase) =>
        phase.start_date != null &&
        phase.end_date != null &&
        (phase.start_date < schedule.start! || phase.end_date > schedule.end!),
    )
    if (outside) {
      reasons.push('dates_outside_project')
    }

    if (schedule.durationDays != null) {
      const tooLong = phases.some((phase) => {
        if (!phase.start_date || !phase.end_date) {
          return false
        }
        return (
          getPhaseDurationDays(phase.start_date, phase.end_date) >
          schedule.durationDays!
        )
      })
      if (tooLong) {
        reasons.push('dates_outside_project')
      }
    }
  }

  if (project.budget != null) {
    const exceeds = phases.some(
      (phase) => Number(phase.expected_budget) > Number(project.budget),
    )
    if (exceeds) {
      reasons.push('phase_budget_exceeds_project')
    }
  }

  return {
    ready: reasons.length === 0,
    reasons: [...new Set(reasons)],
  }
}

export function sumTaskWeights(
  tasks: Array<{ weight_percent: number }>,
): number {
  return tasks.reduce((sum, task) => sum + Number(task.weight_percent), 0)
}

export function isTaskWeightSumValid(
  tasks: Array<{ weight_percent: number }>,
): boolean {
  if (tasks.length === 0) {
    return true
  }

  return Math.abs(sumTaskWeights(tasks) - 100) < 0.01
}

export function remainingTaskWeight(
  tasks: Array<{ id?: string; weight_percent: number }>,
  excludeTaskId?: string,
): number {
  const total = tasks.reduce((sum, task) => {
    if (excludeTaskId && task.id === excludeTaskId) {
      return sum
    }
    return sum + Number(task.weight_percent)
  }, 0)

  return Math.max(0, 100 - total)
}

export function remainingTaskBudget(
  phaseExpectedBudget: number,
  tasks: Array<{ id?: string; expected_cost: number }>,
  excludeTaskId?: string,
): number {
  const used = tasks.reduce((sum, task) => {
    if (excludeTaskId && task.id === excludeTaskId) {
      return sum
    }
    return sum + Number(task.expected_cost)
  }, 0)

  return Math.max(0, Number(phaseExpectedBudget) - used)
}
