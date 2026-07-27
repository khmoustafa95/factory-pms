import type { Profile, Project, ProjectStatus } from '@/types/database'
import { isProjectManager } from '@/lib/roles'

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

export function canEditProject(status: ProjectStatus): boolean {
  return PROPOSAL_EDITABLE_STATUSES.includes(status)
}

export function canEditProjectDetails(status: ProjectStatus): boolean {
  return PROJECT_DETAILS_EDITABLE_STATUSES.includes(status)
}

export function canSubmitProject(status: ProjectStatus): boolean {
  return status === 'draft' || status === 'rejected'
}

export function canReviewProject(status: ProjectStatus): boolean {
  return status === 'proposed'
}

export function isProposalReviewStatus(status: ProjectStatus): boolean {
  return PROPOSAL_REVIEW_STATUSES.includes(status)
}

/** Assigned project manager may approve or reject a proposed project. */
export function canApproveAsAssignedPm(
  project: Pick<Project, 'status' | 'assigned_pm_id'>,
  profile: Pick<Profile, 'id' | 'role'> | null | undefined,
): boolean {
  if (!profile || !isProjectManager(profile.role)) {
    return false
  }

  return (
    canReviewProject(project.status) && project.assigned_pm_id === profile.id
  )
}

/** Factory managers may manage supporting files while the project is editable. */
export function canManageProjectAttachments(status: ProjectStatus): boolean {
  return PROJECT_DETAILS_EDITABLE_STATUSES.includes(status)
}
