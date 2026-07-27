import type { Profile, Project, ProjectStatus } from '@/types/database'
import { isCompanyDirector, isFactoryManager } from '@/lib/roles'

/** Proposal workflow: drafts and rejected proposals can be rewritten/resubmitted. */
export const PROPOSAL_EDITABLE_STATUSES: ProjectStatus[] = ['draft', 'rejected']

/** Statuses shown in the proposal review UI (pre-WBS). */
export const PROPOSAL_REVIEW_STATUSES: ProjectStatus[] = [
  'draft',
  'proposed',
  'rejected',
]

/** Factory managers may update project details until the project is completed. */
export const PROJECT_DETAILS_EDITABLE_STATUSES: ProjectStatus[] = [
  'draft',
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
  profile: Pick<Profile, 'role'> | null | undefined,
): boolean {
  if (!profile || !isCompanyDirector(profile.role)) {
    return false
  }

  return canReviewProject(project.status)
}

/**
 * Proposal discussion is between company director and factory manager.
 * (Assigned PM may view the proposal but does not participate in this thread.)
 */
export function canDiscussProposal(
  profile: Pick<Profile, 'role'> | null | undefined,
): boolean {
  if (!profile) {
    return false
  }

  return isCompanyDirector(profile.role) || isFactoryManager(profile.role)
}

/** Factory managers may manage supporting files while the project is editable. */
export function canManageProjectAttachments(status: ProjectStatus): boolean {
  return PROJECT_DETAILS_EDITABLE_STATUSES.includes(status)
}
