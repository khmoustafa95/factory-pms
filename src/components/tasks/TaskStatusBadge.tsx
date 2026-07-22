import { Badge } from '@/components/ui/badge'
import { useTranslation } from '@/contexts/LocaleContext'
import { getTaskStatusLabel } from '@/lib/i18n-format'
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
  const { t } = useTranslation()

  return (
    <Badge variant={STATUS_VARIANTS[status]}>
      {getTaskStatusLabel(t, status)}
    </Badge>
  )
}
