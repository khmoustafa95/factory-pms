import type { Profile, Project, ProjectStatus } from '@/types/database'
import {
  isCompanyDirector,
  isFactoryManager,
  isProjectManager,
} from '@/lib/roles'

const PM_OPERATIONS_STATUSES: ProjectStatus[] = [
  'approved',
  'in_progress',
  'paused',
]

const WRITABLE_FINANCE_STATUSES: ProjectStatus[] = [
  'draft',
  'proposed',
  'approved',
  'rejected',
  'in_progress',
  'paused',
]

export function canViewProjectFinance(
  _project: Pick<Project, 'id' | 'status' | 'assigned_pm_id' | 'factory_id'>,
  profile: Pick<Profile, 'id' | 'role' | 'factory_id'> | null | undefined,
): boolean {
  return Boolean(profile)
}

export function canManageProjectFunding(
  project: Pick<Project, 'status' | 'factory_id'>,
  profile: Pick<Profile, 'id' | 'role' | 'factory_id'> | null | undefined,
): boolean {
  if (!profile || !WRITABLE_FINANCE_STATUSES.includes(project.status)) {
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

export function canManageProjectOperations(
  project: Pick<Project, 'status' | 'assigned_pm_id' | 'factory_id'>,
  profile: Pick<Profile, 'id' | 'role' | 'factory_id'> | null | undefined,
): boolean {
  if (!profile || !WRITABLE_FINANCE_STATUSES.includes(project.status)) {
    return false
  }

  if (
    isFactoryManager(profile.role) &&
    profile.factory_id != null &&
    profile.factory_id === project.factory_id
  ) {
    return true
  }

  return (
    isProjectManager(profile.role) &&
    project.assigned_pm_id === profile.id &&
    PM_OPERATIONS_STATUSES.includes(project.status)
  )
}

/** @deprecated Prefer canManageProjectFunding / canManageProjectOperations */
export function canManageProjectFinance(
  project: Pick<Project, 'status' | 'assigned_pm_id' | 'factory_id'>,
  profile: Pick<Profile, 'id' | 'role' | 'factory_id'> | null | undefined,
): boolean {
  return (
    canManageProjectFunding(project, profile) ||
    canManageProjectOperations(project, profile)
  )
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
