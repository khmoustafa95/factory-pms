import { format } from 'date-fns'
import { ArrowLeft, Layers, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PhaseFormDialog } from '@/components/phases/PhaseFormDialog'
import { ProjectStatusBadge } from '@/components/projects/ProjectStatusBadge'
import { TaskFormDialog } from '@/components/tasks/TaskFormDialog'
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
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/hooks/useProject'
import {
  useCreatePhase,
  useDeletePhase,
  usePhases,
  useUpdatePhase,
} from '@/hooks/usePhases'
import {
  useCreateTask,
  useDeleteTask,
  useTasks,
  useUpdateTask,
  type TaskListItem,
} from '@/hooks/useTasks'
import { PHASE_STATUS_LABELS } from '@/lib/phase-status'
import {
  canManageWbs,
  canViewWbs,
  isPhaseWeightSumValid,
  sumPhaseWeights,
} from '@/lib/wbs'
import type { PhaseFormValues } from '@/lib/validations/phase'
import type { TaskFormValues } from '@/lib/validations/task'
import type { Phase } from '@/types/database'

function formatDate(value: string | null): string {
  if (!value) {
    return '—'
  }

  return format(new Date(`${value}T00:00:00`), 'dd MMM yyyy')
}

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { profile } = useAuth()
  const { data: project, isLoading, error } = useProject(projectId)
  const { data: phases = [] } = usePhases(projectId)
  const { data: tasks = [] } = useTasks(projectId)

  const createPhase = useCreatePhase(projectId)
  const updatePhase = useUpdatePhase(projectId)
  const deletePhase = useDeletePhase(projectId)
  const createTask = useCreateTask(projectId)
  const updateTask = useUpdateTask(projectId)
  const deleteTask = useDeleteTask(projectId)

  const [phaseDialogOpen, setPhaseDialogOpen] = useState(false)
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskListItem | null>(null)
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null)

  const tasksByPhase = useMemo(() => {
    const grouped = new Map<string, TaskListItem[]>()

    for (const phase of phases) {
      grouped.set(phase.id, [])
    }

    for (const task of tasks) {
      const phaseTasks = grouped.get(task.phase_id) ?? []
      phaseTasks.push(task)
      grouped.set(task.phase_id, phaseTasks)
    }

    return grouped
  }, [phases, tasks])

  const totalWeight = sumPhaseWeights(phases)
  const weightsValid = isPhaseWeightSumValid(phases)
  const remainingWeight = Math.max(0, 100 - totalWeight)
  const canManage = project ? canManageWbs(project, profile) : false

  if (!isLoading && project && !canViewWbs(project.status)) {
    return <Navigate to="/projects" replace />
  }

  const openCreatePhase = () => {
    setEditingPhase(null)
    setPhaseDialogOpen(true)
  }

  const openEditPhase = (phase: Phase) => {
    setEditingPhase(phase)
    setPhaseDialogOpen(true)
  }

  const openCreateTask = (phaseId: string) => {
    setEditingTask(null)
    setActivePhaseId(phaseId)
    setTaskDialogOpen(true)
  }

  const openEditTask = (task: TaskListItem) => {
    setEditingTask(task)
    setActivePhaseId(task.phase_id)
    setTaskDialogOpen(true)
  }

  const handlePhaseSubmit = async (values: PhaseFormValues) => {
    try {
      if (editingPhase) {
        await updatePhase.mutateAsync({ id: editingPhase.id, values })
        toast.success('Phase updated')
      } else {
        await createPhase.mutateAsync(values)
        toast.success('Phase added')
      }
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Unable to save phase'
      toast.error(message)
      throw submitError
    }
  }

  const handleDeletePhase = async (phase: Phase) => {
    try {
      await deletePhase.mutateAsync(phase.id)
      toast.success('Phase deleted')
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Unable to delete phase'
      toast.error(message)
    }
  }

  const handleTaskSubmit = async (values: TaskFormValues) => {
    if (!activePhaseId) {
      return
    }

    try {
      if (editingTask) {
        await updateTask.mutateAsync({ id: editingTask.id, values })
        toast.success('Task updated')
      } else {
        await createTask.mutateAsync({ phaseId: activePhaseId, values })
        toast.success('Task added')
      }
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Unable to save task'
      toast.error(message)
      throw submitError
    }
  }

  const handleDeleteTask = async (task: TaskListItem) => {
    try {
      await deleteTask.mutateAsync(task.id)
      toast.success('Task deleted')
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Unable to delete task'
      toast.error(message)
    }
  }

  const activePhase = phases.find((phase) => phase.id === activePhaseId) ?? null
  const isSavingPhase = createPhase.isPending || updatePhase.isPending
  const isSavingTask = createTask.isPending || updateTask.isPending

  return (
    <section className="space-y-6">
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/projects">
            <ArrowLeft className="size-4" />
            Back to projects
          </Link>
        </Button>

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading project…</p>
        ) : null}

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error instanceof Error ? error.message : 'Failed to load project'}
          </p>
        ) : null}

        {project ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">
                {project.title}
              </h1>
              <ProjectStatusBadge status={project.status} />
            </div>
            {project.description ? (
              <p className="max-w-3xl text-slate-600">{project.description}</p>
            ) : null}
            <div className="flex flex-wrap gap-4 text-sm text-slate-500">
              {project.factories ? (
                <span>
                  Factory: {project.factories.name} ({project.factories.code})
                </span>
              ) : null}
              {project.assigned_pm ? (
                <span>PM: {project.assigned_pm.full_name}</span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {project ? (
        <>
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
                <Button
                  onClick={openCreatePhase}
                  disabled={remainingWeight <= 0}
                >
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
                              <Badge variant="outline">
                                {phase.weight_percent}%
                              </Badge>
                            </CardTitle>
                            <CardDescription>
                              {PHASE_STATUS_LABELS[phase.status]}
                              {phase.description
                                ? ` — ${phase.description}`
                                : ''}
                            </CardDescription>
                          </div>
                          {canManage ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditPhase(phase)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void handleDeletePhase(phase)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => openCreateTask(phase.id)}
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
                                        <p className="font-medium">
                                          {task.title}
                                        </p>
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
                                    <TableCell>
                                      {formatDate(task.due_date)}
                                    </TableCell>
                                    {canManage ? (
                                      <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openEditTask(task)}
                                          >
                                            Edit
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                              void handleDeleteTask(task)
                                            }
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

          {canManage ? (
            <>
              <PhaseFormDialog
                open={phaseDialogOpen}
                onOpenChange={setPhaseDialogOpen}
                phase={editingPhase}
                remainingWeight={remainingWeight}
                onSubmit={handlePhaseSubmit}
                isSubmitting={isSavingPhase}
              />

              <TaskFormDialog
                open={taskDialogOpen}
                onOpenChange={setTaskDialogOpen}
                task={editingTask}
                phaseName={activePhase?.name ?? 'Phase'}
                factoryId={project.factory_id}
                onSubmit={handleTaskSubmit}
                isSubmitting={isSavingTask}
              />
            </>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
