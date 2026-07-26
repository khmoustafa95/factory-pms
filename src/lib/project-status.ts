import type { ProjectStatus } from '@/types/database'

/** Proposal workflow: drafts and rejected proposals can be rewritten/resubmitted. */
export const PROPOSAL_EDITABLE_STATUSES: ProjectStatus[] = ['draft', 'rejected']

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
