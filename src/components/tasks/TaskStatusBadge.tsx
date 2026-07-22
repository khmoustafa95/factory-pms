import { Badge } from '@/components/ui/badge'
import { TASK_STATUS_LABELS } from '@/lib/task-status'
import type { TaskStatus } from '@/types/database'

const STATUS_VARIANTS: Record<
  TaskStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  todo: 'secondary',
  in_progress: 'outline',
  blocked: 'destructive',
  done: 'default',
}

interface TaskStatusBadgeProps {
  status: TaskStatus
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  return (
    <Badge variant={STATUS_VARIANTS[status]}>
      {TASK_STATUS_LABELS[status]}
    </Badge>
  )
}
