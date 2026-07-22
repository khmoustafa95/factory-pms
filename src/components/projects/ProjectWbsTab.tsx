import { format } from 'date-fns'
import { Layers, Plus, Trash2 } from 'lucide-react'
import { TaskStatusBadge } from '@/components/tasks/TaskStatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { TaskListItem } from '@/hooks/useTasks'
import { PHASE_STATUS_LABELS } from '@/lib/phase-status'
import type { Phase } from '@/types/database'

function formatDate(value: string | null): string {
  if (!value) {
    return '—'
  }

  return format(new Date(`${value}T00:00:00`), 'dd MMM yyyy')
}

interface ProjectWbsTabProps {
  phases: Phase[]
  tasksByPhase: Map<string, TaskListItem[]>
  canManage: boolean
  remainingWeight: number
  totalWeight: number
  weightsValid: boolean
  onCreatePhase: () => void
  onEditPhase: (phase: Phase) => void
  onDeletePhase: (phase: Phase) => void
  onCreateTask: (phaseId: string) => void
  onEditTask: (task: TaskListItem) => void
  onDeleteTask: (task: TaskListItem) => void
}

export function ProjectWbsTab({
  phases,
  tasksByPhase,
  canManage,
  remainingWeight,
  totalWeight,
  weightsValid,
  onCreatePhase,
  onEditPhase,
  onDeletePhase,
  onCreateTask,
  onEditTask,
  onDeleteTask,
}: ProjectWbsTabProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Layers className="size-5" />
            Work breakdown structure
          </CardTitle>
          <CardDescription>
            {canManage
              ? 'Define phases with weights that total 100%, then add tasks under each phase.'
              : 'View phases and tasks for this project.'}
          </CardDescription>
        </div>
        {canManage ? (
          <Button onClick={onCreatePhase} disabled={remainingWeight <= 0}>
            <Plus className="size-4" />
            Add phase
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={
            weightsValid
              ? 'rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800'
              : 'rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800'
          }
        >
          Phase weights total: <strong>{totalWeight.toFixed(1)}%</strong>
          {weightsValid
            ? ' — valid WBS'
            : ' — must equal 100% across all phases'}
        </div>

        {phases.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            {canManage
              ? 'No phases yet. Add the first phase to start planning.'
              : 'No phases defined for this project yet.'}
          </p>
        ) : (
          <div className="space-y-4">
            {phases.map((phase) => {
              const phaseTasks = tasksByPhase.get(phase.id) ?? []

              return (
                <Card key={phase.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
                    <div className="space-y-1">
                      <CardTitle className="text-base">
                        {phase.name}{' '}
                        <Badge variant="outline">{phase.weight_percent}%</Badge>
                      </CardTitle>
                      <CardDescription>
                        {PHASE_STATUS_LABELS[phase.status]}
                        {phase.description ? ` — ${phase.description}` : ''}
                      </CardDescription>
                    </div>
                    {canManage ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEditPhase(phase)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void onDeletePhase(phase)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => onCreateTask(phase.id)}
                        >
                          <Plus className="size-4" />
                          Task
                        </Button>
                      </div>
                    ) : null}
                  </CardHeader>
                  <CardContent>
                    {phaseTasks.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No tasks in this phase.
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Task</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Assignee</TableHead>
                            <TableHead>Due</TableHead>
                            {canManage ? (
                              <TableHead className="text-right">
                                Actions
                              </TableHead>
                            ) : null}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {phaseTasks.map((task) => (
                            <TableRow key={task.id}>
                              <TableCell>
                                <div className="space-y-1">
                                  <p className="font-medium">{task.title}</p>
                                  {task.status === 'blocked' &&
                                  task.blocked_reason ? (
                                    <p className="text-sm text-red-600">
                                      Blocked: {task.blocked_reason}
                                    </p>
                                  ) : null}
                                </div>
                              </TableCell>
                              <TableCell>
                                <TaskStatusBadge status={task.status} />
                              </TableCell>
                              <TableCell>
                                {task.assignee?.full_name ?? '—'}
                              </TableCell>
                              <TableCell>{formatDate(task.due_date)}</TableCell>
                              {canManage ? (
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => onEditTask(task)}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => void onDeleteTask(task)}
                                    >
                                      <Trash2 className="size-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              ) : null}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
