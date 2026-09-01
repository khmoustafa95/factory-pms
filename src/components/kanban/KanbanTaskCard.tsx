import type { Ref } from 'react'
import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { GripVertical } from 'lucide-react'
import { TaskStatusBadge } from '@/components/tasks/TaskStatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslation } from '@/contexts/LocaleContext'
import type { TaskListItem } from '@/hooks/useTasks'
import { formatLocalizedDate, getTaskStatusLabel } from '@/lib/i18n-format'
import { TASK_STATUS_OPTIONS, isTaskStatus } from '@/lib/task-status'
import { cn } from '@/lib/utils'
import type { TaskStatus } from '@/types/database'
import type { KanbanTaskDragData } from '@/components/kanban/kanban-dnd'

interface KanbanTaskCardProps {
  task: TaskListItem
  phaseName: string
  canManage: boolean
  isPending: boolean
  onStatusChange: (status: TaskStatus) => void
}

interface KanbanTaskCardViewProps extends KanbanTaskCardProps {
  ref?: Ref<HTMLDivElement>
  isDragging?: boolean
  isOverlay?: boolean
  dragAttributes?: DraggableAttributes
  dragListeners?: DraggableSyntheticListeners
}

function KanbanTaskCardView({
  ref,
  task,
  phaseName,
  canManage,
  isPending,
  onStatusChange,
  isDragging = false,
  isOverlay = false,
  dragAttributes,
  dragListeners,
}: KanbanTaskCardViewProps) {
  const { t, locale } = useTranslation()
  const showControls = canManage && !isOverlay

  return (
    <Card
      ref={ref}
      size="sm"
      className={cn(
        'bg-card shadow-sm',
        canManage && !isOverlay && 'cursor-grab',
        (isDragging || isOverlay) && 'cursor-grabbing shadow-lg',
        isDragging && 'opacity-40',
        isOverlay && 'rotate-1 scale-[1.02] ring-1 ring-foreground/15',
      )}
      {...dragAttributes}
      {...dragListeners}
    >
      <CardContent className="space-y-2 p-3">
        <div className="flex items-start gap-1.5">
          {canManage ? (
            <GripVertical
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
          ) : null}
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-medium">{task.title}</p>
            <p className="text-xs text-muted-foreground">{phaseName}</p>
          </div>
        </div>
        {task.status === 'blocked' && task.blocked_reason ? (
          <p className="text-xs text-destructive">{task.blocked_reason}</p>
        ) : null}
        {task.due_date ? (
          <p className="text-xs text-muted-foreground">
            {t('wbs.dueDate')}: {formatLocalizedDate(task.due_date, locale)}
          </p>
        ) : null}
        <TaskStatusBadge status={task.status} />
        {showControls ? (
          <div className="pt-1" data-no-dnd>
            <Label className="sr-only" htmlFor={`status-${task.id}`}>
              {t('wbs.taskStatus')}
            </Label>
            <Select
              value={task.status}
              onValueChange={(value) => {
                if (!isTaskStatus(value) || value === task.status) {
                  return
                }
                onStatusChange(value)
              }}
              disabled={isPending}
            >
              <SelectTrigger
                id={`status-${task.id}`}
                className="h-8 w-full text-xs"
                aria-label={t('a11y.moveTaskTo', {
                  status: getTaskStatusLabel(t, task.status),
                })}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_STATUS_OPTIONS.filter(
                  (option) => option !== task.status,
                ).map((option) => (
                  <SelectItem key={option} value={option}>
                    {getTaskStatusLabel(t, option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function DraggableKanbanTaskCard({
  task,
  phaseName,
  canManage,
  isPending,
  onStatusChange,
}: KanbanTaskCardProps) {
  const { t } = useTranslation()
  const dragData: KanbanTaskDragData = { type: 'task', task }
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: dragData,
    disabled: isPending,
    attributes: {
      role: 'group',
      tabIndex: -1,
      roleDescription: t('wbs.dragToChangeStatus'),
    },
  })

  return (
    <KanbanTaskCardView
      ref={setNodeRef}
      task={task}
      phaseName={phaseName}
      canManage={canManage}
      isPending={isPending}
      onStatusChange={onStatusChange}
      isDragging={isDragging}
      dragAttributes={attributes}
      dragListeners={listeners}
    />
  )
}

export function KanbanTaskCard(props: KanbanTaskCardProps) {
  if (!props.canManage) {
    return <KanbanTaskCardView {...props} />
  }

  return <DraggableKanbanTaskCard {...props} />
}

export function KanbanTaskCardOverlay({
  task,
  phaseName,
}: {
  task: TaskListItem
  phaseName: string
}) {
  return (
    <KanbanTaskCardView
      task={task}
      phaseName={phaseName}
      canManage
      isPending={false}
      onStatusChange={() => undefined}
      isOverlay
    />
  )
}
