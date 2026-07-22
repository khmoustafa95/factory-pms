import type { PhaseStatus } from '@/types/database'

export const PHASE_STATUS_LABELS: Record<PhaseStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Completed',
}
