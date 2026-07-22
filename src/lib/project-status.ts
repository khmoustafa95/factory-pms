import type { ProjectStatus } from '@/types/database'

export const EDITABLE_PROJECT_STATUSES: ProjectStatus[] = ['draft', 'rejected']

export function canEditProject(status: ProjectStatus): boolean {
  return EDITABLE_PROJECT_STATUSES.includes(status)
}

export function canSubmitProject(status: ProjectStatus): boolean {
  return status === 'draft' || status === 'rejected'
}

export function canReviewProject(status: ProjectStatus): boolean {
  return status === 'proposed'
}
