import { Badge } from '@/components/ui/badge'
import { PROJECT_STATUS_LABELS } from '@/lib/project-status'
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
  return (
    <Badge variant={STATUS_VARIANTS[status]}>
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  )
}
