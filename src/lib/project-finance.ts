import type { Profile, Project, ProjectStatus } from '@/types/database'
import { canControl, isCompanyDirector, isFactoryManager } from '@/lib/roles'

type RoleProfile = Pick<
  Profile,
  'id' | 'role' | 'factory_id' | 'can_control'
> | null | undefined

const POST_APPROVAL_WRITE_STATUSES: ProjectStatus[] = [
  'approved',
  'in_progress',
  'paused',
]

export function canViewProjectFinance(
  _project: Pick<Project, 'id' | 'status' | 'factory_id'>,
  profile: RoleProfile,
): boolean {
  return Boolean(profile)
}

export function canManageProjectFunding(
  project: Pick<Project, 'status' | 'factory_id'>,
  profile: RoleProfile,
): boolean {
  if (
    !profile ||
    !canControl(profile) ||
    !POST_APPROVAL_WRITE_STATUSES.includes(project.status)
  ) {
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
  project: Pick<Project, 'status' | 'factory_id'>,
  profile: RoleProfile,
): boolean {
  if (
    !profile ||
    !canControl(profile) ||
    !POST_APPROVAL_WRITE_STATUSES.includes(project.status)
  ) {
    return false
  }

  return (
    isFactoryManager(profile.role) &&
    profile.factory_id != null &&
    profile.factory_id === project.factory_id
  )
}

/** @deprecated Prefer canManageProjectFunding / canManageProjectOperations */
export function canManageProjectFinance(
  project: Pick<Project, 'status' | 'factory_id'>,
  profile: RoleProfile,
): boolean {
  return (
    canManageProjectFunding(project, profile) ||
    canManageProjectOperations(project, profile)
  )
}

export function countOpenProcurement(items: Array<{ status: string }>): number {
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
