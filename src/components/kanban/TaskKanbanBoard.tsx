import { format } from 'date-fns'
import { useState } from 'react'
import { toast } from 'sonner'
import { TaskStatusBadge } from '@/components/tasks/TaskStatusBadge'
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
import { Textarea } from '@/components/ui/textarea'
import type { TaskListItem } from '@/hooks/useTasks'
import { useUpdateTaskStatus } from '@/hooks/useTasks'
import { TASK_STATUS_LABELS, TASK_STATUS_OPTIONS } from '@/lib/task-status'
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
  const updateStatus = useUpdateTaskStatus(projectId)
  const [blockedTask, setBlockedTask] = useState<TaskListItem | null>(null)
  const [blockedReason, setBlockedReason] = useState('')

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

    try {
      await updateStatus.mutateAsync({
        id: task.id,
        status,
        blockedReason: reason,
      })
      toast.success('Task status updated')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to update task'
      toast.error(message)
    }
  }

  const submitBlocked = async () => {
    if (!blockedTask || !blockedReason.trim()) {
      return
    }

    await changeStatus(blockedTask, 'blocked', blockedReason)
    setBlockedTask(null)
    setBlockedReason('')
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {TASK_STATUS_OPTIONS.map((status) => (
          <Card key={status} className="bg-slate-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                {TASK_STATUS_LABELS[status]} ({tasksByStatus[status].length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasksByStatus[status].length === 0 ? (
                <p className="text-sm text-slate-500">No tasks</p>
              ) : (
                tasksByStatus[status].map((task) => (
                  <Card key={task.id} className="bg-white shadow-sm">
                    <CardContent className="space-y-2 p-3">
                      <div className="space-y-1">
                        <p className="font-medium">{task.title}</p>
                        <p className="text-xs text-slate-500">
                          {phaseNameById.get(task.phase_id) ?? 'Phase'}
                        </p>
                      </div>
                      {task.status === 'blocked' && task.blocked_reason ? (
                        <p className="text-xs text-red-600">
                          {task.blocked_reason}
                        </p>
                      ) : null}
                      {task.due_date ? (
                        <p className="text-xs text-slate-500">
                          Due{' '}
                          {format(
                            new Date(`${task.due_date}T00:00:00`),
                            'dd MMM yyyy',
                          )}
                        </p>
                      ) : null}
                      <TaskStatusBadge status={task.status} />
                      {canManage ? (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {TASK_STATUS_OPTIONS.filter(
                            (option) => option !== task.status,
                          ).map((option) => (
                            <Button
                              key={option}
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={updateStatus.isPending}
                              onClick={() => void changeStatus(task, option)}
                            >
                              → {TASK_STATUS_LABELS[option]}
                            </Button>
                          ))}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>

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
            <DialogTitle>Mark task as blocked</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="kanban-blocked-reason">Blocked reason</Label>
            <Textarea
              id="kanban-blocked-reason"
              rows={4}
              value={blockedReason}
              onChange={(event) => setBlockedReason(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockedTask(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!blockedReason.trim() || updateStatus.isPending}
              onClick={() => void submitBlocked()}
            >
              Mark blocked
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
