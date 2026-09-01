import type { CSSProperties } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { KanbanTaskCard } from '@/components/kanban/KanbanTaskCard'
import type { KanbanColumnDragData } from '@/components/kanban/kanban-dnd'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslation } from '@/contexts/LocaleContext'
import type { TaskListItem } from '@/hooks/useTasks'
import { getTaskStatusLabel } from '@/lib/i18n-format'
import { cn } from '@/lib/utils'
import type { TaskStatus } from '@/types/database'

interface KanbanColumnProps {
  status: TaskStatus
  tasks: TaskListItem[]
  phaseNameById: Map<string, string>
  canManage: boolean
  isPending: boolean
  onStatusChange: (task: TaskListItem, status: TaskStatus) => void
  className?: string
  style?: CSSProperties
}

export function KanbanColumn({
  status,
  tasks,
  phaseNameById,
  canManage,
  isPending,
  onStatusChange,
  className,
  style,
}: KanbanColumnProps) {
  const { t } = useTranslation()
  const dropData: KanbanColumnDragData = { type: 'column', status }
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: dropData,
    disabled: !canManage,
  })

  return (
    <Card
      ref={setNodeRef}
      role="listitem"
      style={style}
      className={cn(
        'w-[min(100%,18rem)] shrink-0 snap-start bg-muted md:w-auto md:shrink',
        isOver && 'bg-primary/5 ring-2 ring-inset ring-primary',
        className,
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          {getTaskStatusLabel(t, status)} ({tasks.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="min-h-32 space-y-3">
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {canManage && isOver
              ? t('wbs.kanbanDropHere')
              : t('wbs.noTasksKanban')}
          </p>
        ) : (
          tasks.map((task) => (
            <KanbanTaskCard
              key={task.id}
              task={task}
              phaseName={phaseNameById.get(task.phase_id) ?? t('common.phase')}
              canManage={canManage}
              isPending={isPending}
              onStatusChange={(nextStatus) => onStatusChange(task, nextStatus)}
            />
          ))
        )}
      </CardContent>
    </Card>
  )
}
