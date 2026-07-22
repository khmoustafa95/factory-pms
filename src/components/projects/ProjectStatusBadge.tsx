import { Badge } from '@/components/ui/badge'
import { useTranslation } from '@/contexts/LocaleContext'
import { getProjectStatusLabel } from '@/lib/i18n-format'
import type { ProjectStatus } from '@/types/database'

const STATUS_VARIANTS: Record<
  ProjectStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  draft: 'secondary',
  proposed: 'outline',
  approved: 'default',
  rejected: 'destructive',
  in_progress: 'default',
  completed: 'default',
  paused: 'secondary',
}

interface ProjectStatusBadgeProps {
  status: ProjectStatus
}

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  const { t } = useTranslation()

  return (
    <Badge variant={STATUS_VARIANTS[status]}>
      {getProjectStatusLabel(t, status)}
    </Badge>
  )
}
