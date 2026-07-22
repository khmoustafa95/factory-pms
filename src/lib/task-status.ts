import type { TaskStatus } from '@/types/database'

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  blocked: 'Blocked',
  done: 'Done',
}

export const TASK_STATUS_OPTIONS: TaskStatus[] = [
  'todo',
  'in_progress',
  'blocked',
  'done',
]
