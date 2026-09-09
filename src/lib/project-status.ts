import type { Profile, Project, ProjectStatus } from '@/types/database'
import { canControl, isCompanyDirector, isFactoryManager } from '@/lib/roles'

type RoleProfile = Pick<
  Profile,
  'id' | 'role' | 'factory_id' | 'can_control'
> | null | undefined

/** Proposal workflow: drafts and rejected proposals can be rewritten/resubmitted. */
export const PROPOSAL_EDITABLE_STATUSES: ProjectStatus[] = ['draft', 'rejected']

/** Statuses shown in the proposal review UI (pre-WBS). */
export const PROPOSAL_REVIEW_STATUSES: ProjectStatus[] = [
  'draft',
  'consultation',
  'proposed',
  'rejected',
]

/** Factory managers may rewrite proposal fields before consultation/review. */
export const PROJECT_DETAILS_EDITABLE_STATUSES: ProjectStatus[] = [
  'draft',
  'rejected',
]

/** Supporting files stay editable until the project is closed. */
export const PROJECT_ATTACHMENT_EDITABLE_STATUSES: ProjectStatus[] = [
  'draft',
  'consultation',
  'proposed',
  'approved',
  'rejected',
  'in_progress',
  'paused',
]

export function canSubmitProject(status: ProjectStatus): boolean {
  return PROPOSAL_EDITABLE_STATUSES.includes(status)
}

export function canEditProjectDetails(status: ProjectStatus): boolean {
  return PROJECT_DETAILS_EDITABLE_STATUSES.includes(status)
}

export function canReviewProject(status: ProjectStatus): boolean {
  return status === 'proposed'
}

export function isProposalReviewStatus(status: ProjectStatus): boolean {
  return PROPOSAL_REVIEW_STATUSES.includes(status)
}

/** Company director may approve or reject a proposed project. */
export function canApproveAsDirector(
  project: Pick<Project, 'status'>,
  profile: RoleProfile,
): boolean {
  if (!profile || !canControl(profile) || !isCompanyDirector(profile.role)) {
    return false
  }

  return canReviewProject(project.status)
}

/** Director may edit research/board opinions while in consultation. */
export function canEditConsultationOpinions(
  project: Pick<Project, 'status'>,
  profile: RoleProfile,
): boolean {
  if (!profile || !canControl(profile) || !isCompanyDirector(profile.role)) {
    return false
  }

  return project.status === 'consultation'
}

/** Director may complete consultation → proposed when opinions are present (UI). */
export function canCompleteConsultation(
  project: Pick<Project, 'status'>,
  profile: RoleProfile,
): boolean {
  return canEditConsultationOpinions(project, profile)
}

/**
 * Proposal discussion is between company director and factory manager
 * accounts that can control.
 */
export function canDiscussProposal(profile: RoleProfile): boolean {
  if (!profile || !canControl(profile)) {
    return false
  }

  return isCompanyDirector(profile.role) || isFactoryManager(profile.role)
}

/** Comments on execution (including completed) for controlling accounts. */
export function canCommentOnProject(
  status: ProjectStatus,
  profile: RoleProfile,
): boolean {
  if (!profile || !canControl(profile)) {
    return false
  }

  if (PROPOSAL_REVIEW_STATUSES.includes(status)) {
    return canDiscussProposal(profile)
  }

  return isCompanyDirector(profile.role) || isFactoryManager(profile.role)
}

export function canManageProjectAttachments(
  status: ProjectStatus,
  profile: RoleProfile,
): boolean {
  if (
    !profile ||
    !canControl(profile) ||
    !isFactoryManager(profile.role) ||
    !profile.factory_id
  ) {
    return false
  }

  return PROJECT_ATTACHMENT_EDITABLE_STATUSES.includes(status)
}

export function canRequestProjectChange(status: ProjectStatus): boolean {
  return (
    status === 'approved' || status === 'in_progress' || status === 'paused'
  )
}
