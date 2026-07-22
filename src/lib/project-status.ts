import type { ProjectStatus } from '@/types/database'

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: 'Draft',
  proposed: 'Proposed',
  approved: 'Approved',
  rejected: 'Rejected',
  in_progress: 'In progress',
  completed: 'Completed',
  paused: 'Paused',
}

export const EDITABLE_PROJECT_STATUSES: ProjectStatus[] = ['draft', 'rejected']

export function canEditProject(status: ProjectStatus): boolean {
  return EDITABLE_PROJECT_STATUSES.includes(status)
}

export function canSubmitProject(status: ProjectStatus): boolean {
  return status === 'draft' || status === 'rejected'
}
