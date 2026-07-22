import type { TaskStatus } from '@/types/database'

export const TASK_STATUS_OPTIONS: TaskStatus[] = [
  'todo',
  'in_progress',
  'blocked',
  'done',
]
