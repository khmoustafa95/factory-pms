import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  defaultKeyboardCoordinateGetter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { toast } from 'sonner'
import { KanbanColumn } from '@/components/kanban/KanbanColumn'
import { KanbanTaskCardOverlay } from '@/components/kanban/KanbanTaskCard'
import {
  KanbanPointerSensor,
  getDroppableStatus,
  isKanbanTaskDragData,
  kanbanCollisionDetection,
} from '@/components/kanban/kanban-dnd'
import { TaskCompleteDialog } from '@/components/tasks/TaskCompleteDialog'
import { StaggerGroup } from '@/components/motion'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useTranslation } from '@/contexts/LocaleContext'
import { useIsMobile } from '@/hooks/use-mobile'
import type { TaskListItem } from '@/hooks/useTasks'
import { useUpdateTaskStatus } from '@/hooks/useTasks'
import { getTaskStatusLabel } from '@/lib/i18n-format'
import { toastMutationError } from '@/lib/mutation-error'
import { TASK_STATUS_OPTIONS } from '@/lib/task-status'
import type { TaskCompletionValues } from '@/lib/validations/task'
import type { Phase, TaskStatus } from '@/types/database'

interface TaskKanbanBoardProps {
  projectId: string
  phases: Phase[]
  tasks: TaskListItem[]
  canManage: boolean
}

export function TaskKanbanBoard({
  projectId,
  phases,
  tasks,
  canManage,
}: TaskKanbanBoardProps) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const updateStatus = useUpdateTaskStatus(projectId)
  const [blockedTask, setBlockedTask] = useState<TaskListItem | null>(null)
  const [blockedReason, setBlockedReason] = useState('')
  const [completingTask, setCompletingTask] = useState<TaskListItem | null>(
    null,
  )
  const [activeTask, setActiveTask] = useState<TaskListItem | null>(null)

  const sensors = useSensors(
    useSensor(KanbanPointerSensor, {
      activationConstraint: isMobile
        ? { delay: 220, tolerance: 8 }
        : { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: defaultKeyboardCoordinateGetter,
    }),
  )

  const phaseNameById = new Map(phases.map((phase) => [phase.id, phase.name]))

  const tasksByStatus = TASK_STATUS_OPTIONS.reduce(
    (acc, status) => {
      acc[status] = tasks.filter((task) => task.status === status)
      return acc
    },
    {} as Record<TaskStatus, TaskListItem[]>,
  )

  const changeStatus = async (
    task: TaskListItem,
    status: TaskStatus,
    reason?: string,
  ) => {
    if (status === 'blocked' && !reason?.trim()) {
      setBlockedTask(task)
      return
    }

    if (status === 'done') {
      setCompletingTask(task)
      return
    }

    try {
      await updateStatus.mutateAsync({
        id: task.id,
        status,
        blockedReason: reason,
      })
      toast.success(t('wbs.taskStatusUpdated'))
    } catch (error) {
      toastMutationError(error, t('wbs.updateTaskStatusFailed'), t)
    }
  }

  const submitBlocked = async () => {
    if (!blockedTask || !blockedReason.trim()) {
      return
    }

    try {
      await updateStatus.mutateAsync({
        id: blockedTask.id,
        status: 'blocked',
        blockedReason,
      })
      toast.success(t('wbs.taskStatusUpdated'))
      setBlockedTask(null)
      setBlockedReason('')
    } catch (error) {
      toastMutationError(error, t('wbs.updateTaskStatusFailed'), t)
    }
  }

  const submitComplete = async (values: TaskCompletionValues) => {
    if (!completingTask) {
      return
    }

    try {
      await updateStatus.mutateAsync({
        id: completingTask.id,
        status: 'done',
        completion: values,
      })
      toast.success(t('wbs.taskStatusUpdated'))
      setCompletingTask(null)
    } catch (error) {
      toastMutationError(error, t('wbs.updateTaskStatusFailed'), t)
      throw error
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    if (!isKanbanTaskDragData(event.active.data.current)) {
      return
    }
    setActiveTask(event.active.data.current.task)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!canManage || !over || updateStatus.isPending) {
      return
    }

    if (!isKanbanTaskDragData(active.data.current)) {
      return
    }

    const nextStatus = getDroppableStatus(over)
    const task = active.data.current.task
    if (!nextStatus || nextStatus === task.status) {
      return
    }

    void changeStatus(task, nextStatus)
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={kanbanCollisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveTask(null)}
        accessibility={{
          screenReaderInstructions: {
            draggable: t('a11y.kanbanDragInstructions'),
          },
          announcements: {
            onDragStart: ({ active }) => {
              if (!isKanbanTaskDragData(active.data.current)) {
                return undefined
              }
              return t('a11y.kanbanDragStart', {
                title: active.data.current.task.title,
              })
            },
            onDragOver: ({ active, over }) => {
              if (!over || !isKanbanTaskDragData(active.data.current)) {
                return undefined
              }
              const status = getDroppableStatus(over)
              if (!status) {
                return undefined
              }
              return t('a11y.kanbanDragOver', {
                title: active.data.current.task.title,
                status: getTaskStatusLabel(t, status),
              })
            },
            onDragEnd: ({ active, over }) => {
              if (!isKanbanTaskDragData(active.data.current)) {
                return undefined
              }
              const title = active.data.current.task.title
              if (!over) {
                return t('a11y.kanbanDragCancel', {
                  title,
                  status: getTaskStatusLabel(
                    t,
                    active.data.current.task.status,
                  ),
                })
              }
              const status = getDroppableStatus(over)
              if (!status) {
                return undefined
              }
              return t('a11y.kanbanDragEnd', {
                title,
                status: getTaskStatusLabel(t, status),
              })
            },
            onDragCancel: ({ active }) => {
              if (!isKanbanTaskDragData(active.data.current)) {
                return undefined
              }
              return t('a11y.kanbanDragCancel', {
                title: active.data.current.task.title,
                status: getTaskStatusLabel(t, active.data.current.task.status),
              })
            },
          },
        }}
      >
        <StaggerGroup
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:overflow-visible md:pb-0 xl:grid-cols-4"
          staggerMs={80}
          role="list"
          aria-label={t('projectDetail.tabs.kanban')}
        >
          {TASK_STATUS_OPTIONS.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={tasksByStatus[status]}
              phaseNameById={phaseNameById}
              canManage={canManage}
              isPending={updateStatus.isPending}
              onStatusChange={(task, nextStatus) => {
                void changeStatus(task, nextStatus)
              }}
            />
          ))}
        </StaggerGroup>
        <DragOverlay>
          {activeTask ? (
            <KanbanTaskCardOverlay
              task={activeTask}
              phaseName={
                phaseNameById.get(activeTask.phase_id) ?? t('common.phase')
              }
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <Dialog
        open={Boolean(blockedTask)}
        onOpenChange={(open) => {
          if (!open) {
            setBlockedTask(null)
            setBlockedReason('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('wbs.markBlocked')}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-2">
            <Label htmlFor="kanban-blocked-reason">
              {t('wbs.blockedReasonLabel')}
            </Label>
            <Textarea
              id="kanban-blocked-reason"
              rows={4}
              value={blockedReason}
              onChange={(event) => setBlockedReason(event.target.value)}
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockedTask(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={!blockedReason.trim() || updateStatus.isPending}
              onClick={() => void submitBlocked()}
            >
              {t('wbs.markBlocked')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TaskCompleteDialog
        open={Boolean(completingTask)}
        onOpenChange={(open) => {
          if (!open) {
            setCompletingTask(null)
          }
        }}
        taskTitle={completingTask?.title ?? ''}
        dueDate={completingTask?.due_date ?? null}
        expectedCost={Number(completingTask?.expected_cost ?? 0)}
        initialActualEndDate={completingTask?.actual_end_date}
        initialActualCost={completingTask?.actual_cost}
        initialScheduleReason={completingTask?.schedule_deviation_reason}
        initialFinancialReason={completingTask?.financial_deviation_reason}
        onSubmit={submitComplete}
        isSubmitting={updateStatus.isPending}
      />
    </>
  )
}
