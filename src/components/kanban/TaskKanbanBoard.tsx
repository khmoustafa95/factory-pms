import { useState } from 'react'
import { toast } from 'sonner'
import { TaskCompleteDialog } from '@/components/tasks/TaskCompleteDialog'
import { TaskStatusBadge } from '@/components/tasks/TaskStatusBadge'
import { StaggerGroup } from '@/components/motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useTranslation } from '@/contexts/LocaleContext'
import type { TaskListItem } from '@/hooks/useTasks'
import { useUpdateTaskStatus } from '@/hooks/useTasks'
import { formatLocalizedDate, getTaskStatusLabel } from '@/lib/i18n-format'
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
  const { t, locale } = useTranslation()
  const updateStatus = useUpdateTaskStatus(projectId)
  const [blockedTask, setBlockedTask] = useState<TaskListItem | null>(null)
  const [blockedReason, setBlockedReason] = useState('')
  const [completingTask, setCompletingTask] = useState<TaskListItem | null>(
    null,
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

  return (
    <>
      <StaggerGroup
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:overflow-visible md:pb-0 xl:grid-cols-4"
        staggerMs={80}
        role="list"
        aria-label={t('projectDetail.tabs.kanban')}
      >
        {TASK_STATUS_OPTIONS.map((status) => (
          <Card
            key={status}
            role="listitem"
            className="w-[min(100%,18rem)] shrink-0 snap-start bg-muted md:w-auto md:shrink"
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                {getTaskStatusLabel(t, status)} ({tasksByStatus[status].length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasksByStatus[status].length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('wbs.noTasksKanban')}
                </p>
              ) : (
                tasksByStatus[status].map((task) => (
                  <Card key={task.id} className="bg-card shadow-sm">
                    <CardContent className="space-y-2 p-3">
                      <div className="space-y-1">
                        <p className="font-medium">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {phaseNameById.get(task.phase_id) ??
                            t('common.phase')}
                        </p>
                      </div>
                      {task.status === 'blocked' && task.blocked_reason ? (
                        <p className="text-xs text-destructive">
                          {task.blocked_reason}
                        </p>
                      ) : null}
                      {task.due_date ? (
                        <p className="text-xs text-muted-foreground">
                          {t('wbs.dueDate')}:{' '}
                          {formatLocalizedDate(task.due_date, locale)}
                        </p>
                      ) : null}
                      <TaskStatusBadge status={task.status} />
                      {canManage ? (
                        <div className="pt-1">
                          <Label
                            className="sr-only"
                            htmlFor={`status-${task.id}`}
                          >
                            {t('wbs.taskStatus')}
                          </Label>
                          <Select
                            value={task.status}
                            onValueChange={(value) => {
                              const nextStatus = value as TaskStatus
                              if (nextStatus === task.status) {
                                return
                              }
                              void changeStatus(task, nextStatus)
                            }}
                            disabled={updateStatus.isPending}
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
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </StaggerGroup>

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
          <div className="space-y-2">
            <Label htmlFor="kanban-blocked-reason">
              {t('wbs.blockedReasonLabel')}
            </Label>
            <Textarea
              id="kanban-blocked-reason"
              rows={4}
              value={blockedReason}
              onChange={(event) => setBlockedReason(event.target.value)}
            />
          </div>
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
