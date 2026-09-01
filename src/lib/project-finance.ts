import type { Profile, Project, ProjectStatus } from '@/types/database'
import { PROJECT_DETAILS_EDITABLE_STATUSES } from '@/lib/project-status'
import {
  isCompanyDirector,
  isFactoryManager,
  isProjectManager,
} from '@/lib/roles'

const PM_FINANCE_MANAGE_STATUSES: ProjectStatus[] = [
  'approved',
  'in_progress',
  'paused',
]

export function canViewProjectFinance(
  _project: Pick<Project, 'id' | 'status' | 'assigned_pm_id' | 'factory_id'>,
  profile: Pick<Profile, 'id' | 'role' | 'factory_id'> | null | undefined,
): boolean {
  if (!profile) {
    return false
  }

  if (isCompanyDirector(profile.role)) {
    return true
  }

  if (isFactoryManager(profile.role)) {
    return true
  }

  if (isProjectManager(profile.role)) {
    return true
  }

  return false
}

export function canManageProjectFinance(
  project: Pick<Project, 'status' | 'assigned_pm_id' | 'factory_id'>,
  profile: Pick<Profile, 'id' | 'role' | 'factory_id'> | null | undefined,
): boolean {
  if (!profile) {
    return false
  }

  if (isCompanyDirector(profile.role)) {
    return PROJECT_DETAILS_EDITABLE_STATUSES.includes(project.status)
  }

  if (isFactoryManager(profile.role)) {
    return PROJECT_DETAILS_EDITABLE_STATUSES.includes(project.status)
  }

  if (isProjectManager(profile.role)) {
    return (
      project.assigned_pm_id === profile.id &&
      PM_FINANCE_MANAGE_STATUSES.includes(project.status)
    )
  }

  return false
}

export function countOpenProcurement(
  items: Array<{ status: string }>,
): number {
  return items.filter(
    (item) => item.status !== 'delivered' && item.status !== 'cancelled',
  ).length
}

export type FundingStatus = 'fully_funded' | 'partial' | 'unfunded' | 'n/a'

export function deriveFundingStatus(
  budget: number | null | undefined,
  fundingReceived: number,
): FundingStatus {
  if (budget == null || budget <= 0) {
    return 'n/a'
  }

  if (fundingReceived >= budget - 0.009) {
    return 'fully_funded'
  }

  if (fundingReceived > 0) {
    return 'partial'
  }

  return 'unfunded'
}
