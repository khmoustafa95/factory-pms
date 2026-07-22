import type { Profile, Project, ProjectStatus } from '@/types/database'
import {
  isCompanyDirector,
  isFactoryManager,
  isProjectManager,
} from '@/lib/roles'

export const WBS_VIEW_STATUSES: ProjectStatus[] = [
  'approved',
  'in_progress',
  'paused',
  'completed',
]

export const WBS_MANAGE_STATUSES: ProjectStatus[] = [
  'approved',
  'in_progress',
  'paused',
]

export function canViewWbs(status: ProjectStatus): boolean {
  return WBS_VIEW_STATUSES.includes(status)
}

export function canManageWbs(
  project: Pick<Project, 'status' | 'assigned_pm_id'>,
  profile: Pick<Profile, 'id' | 'role'> | null | undefined,
): boolean {
  if (!profile || !WBS_MANAGE_STATUSES.includes(project.status)) {
    return false
  }

  if (isCompanyDirector(profile.role)) {
    return true
  }

  if (isFactoryManager(profile.role)) {
    return true
  }

  if (isProjectManager(profile.role)) {
    return project.assigned_pm_id === profile.id
  }

  return false
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
