import type { TaskStatus } from '@/types/database'

export const TASK_STATUS_OPTIONS: TaskStatus[] = [
  'todo',
  'in_progress',
  'blocked',
  'done',
]

export function isTaskStatus(value: unknown): value is TaskStatus {
  return (
    typeof value === 'string' &&
    (TASK_STATUS_OPTIONS as readonly string[]).includes(value)
  )
}
