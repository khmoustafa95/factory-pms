import type { ProjectStatus, TaskStatus } from '@/types/database'

export const PROJECT_STATUS_FILTERS: ProjectStatus[] = [
  'draft',
  'proposed',
  'approved',
  'rejected',
  'in_progress',
  'completed',
  'paused',
]

export type ProgressFilter =
  'all' | '0-24' | '25-49' | '50-74' | '75-99' | '100'
export type BlockedFilter = 'all' | 'blocked' | 'not_blocked'
export type TaskActivityFilter = 'all' | TaskStatus
export type OverdueFilter = 'all' | 'overdue'
export type PhaseIssueFilter = 'all' | 'phase_issues'
export type AttentionDrill =
  | 'blocked'
  | 'overdue'
  | 'proposed'
  | 'draft'
  | 'upcoming'
  | 'phase_issues'
  | 'in_progress'
  | null
