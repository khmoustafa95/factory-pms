import { ArrowLeft } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ProjectTimeline } from '@/components/gantt/ProjectTimeline'
import { TaskKanbanBoard } from '@/components/kanban/TaskKanbanBoard'
import { PhaseFormDialog } from '@/components/phases/PhaseFormDialog'
import { ProjectActivityTab } from '@/components/projects/ProjectActivityTab'
import { ProjectStatusBadge } from '@/components/projects/ProjectStatusBadge'
import { ProjectWbsTab } from '@/components/projects/ProjectWbsTab'
import { ProjectProgressOverview } from '@/components/progress/ProjectProgressOverview'
import { TaskFormDialog } from '@/components/tasks/TaskFormDialog'
import { StatusMessage } from '@/components/StatusMessage'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/contexts/LocaleContext'
import { useProject } from '@/hooks/useProject'
import {
  useCreatePhase,
  useDeletePhase,
  usePhases,
  useUpdatePhase,
} from '@/hooks/usePhases'
import { useProjectRealtime } from '@/hooks/useRealtime'
import {
  useCreateTask,
  useDeleteTask,
  useTasks,
  useUpdateTask,
  type TaskListItem,
} from '@/hooks/useTasks'
import { formatProgress } from '@/lib/progress'
import {
  canManageWbs,
  canViewWbs,
  isPhaseWeightSumValid,
  sumPhaseWeights,
} from '@/lib/wbs'
import type { PhaseFormValues } from '@/lib/validations/phase'
import type { TaskFormValues } from '@/lib/validations/task'
import type { Phase } from '@/types/database'

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { profile } = useAuth()
  const { t } = useTranslation()
  const { data: project, isLoading, error } = useProject(projectId)
  const { data: phases = [] } = usePhases(projectId)
  const { data: tasks = [] } = useTasks(projectId)
  useProjectRealtime(projectId)

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

  const phaseIds = useMemo(() => phases.map((phase) => phase.id), [phases])
  const taskIds = useMemo(() => tasks.map((task) => task.id), [tasks])
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
        toast.success(t('projectDetail.phaseUpdated'))
      } else {
        await createPhase.mutateAsync(values)
        toast.success(t('projectDetail.phaseAdded'))
      }
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : t('projectDetail.savePhaseFailed')
      toast.error(message)
      throw submitError
    }
  }

  const handleDeletePhase = async (phase: Phase) => {
    try {
      await deletePhase.mutateAsync(phase.id)
      toast.success(t('projectDetail.phaseDeleted'))
    } catch (submitError) {
      toast.error(
        submitError instanceof Error
          ? submitError.message
          : t('projectDetail.deletePhaseFailed'),
      )
    }
  }

  const handleTaskSubmit = async (values: TaskFormValues) => {
    if (!activePhaseId) {
      return
    }

    try {
      if (editingTask) {
        await updateTask.mutateAsync({ id: editingTask.id, values })
        toast.success(t('projectDetail.taskUpdated'))
      } else {
        await createTask.mutateAsync({ phaseId: activePhaseId, values })
        toast.success(t('projectDetail.taskAdded'))
      }
    } catch (submitError) {
      toast.error(
        submitError instanceof Error
          ? submitError.message
          : t('projectDetail.saveTaskFailed'),
      )
      throw submitError
    }
  }

  const handleDeleteTask = async (task: TaskListItem) => {
    try {
      await deleteTask.mutateAsync(task.id)
      toast.success(t('projectDetail.taskDeleted'))
    } catch (submitError) {
      toast.error(
        submitError instanceof Error
          ? submitError.message
          : t('projectDetail.deleteTaskFailed'),
      )
    }
  }

  const activePhase = phases.find((phase) => phase.id === activePhaseId) ?? null

  return (
    <section className="space-y-6">
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/projects">
            <ArrowLeft className="size-4" />
            {t('projectDetail.backToProjects')}
          </Link>
        </Button>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">
            {t('projectDetail.loading')}
          </p>
        ) : null}

        {error ? (
          <StatusMessage variant="error">
            {error instanceof Error
              ? error.message
              : t('projectDetail.loadFailed')}
          </StatusMessage>
        ) : null}

        {project ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">
                {project.title}
              </h1>
              <ProjectStatusBadge status={project.status} />
              <span className="text-sm text-muted-foreground">
                {t('projectDetail.progressLabel', {
                  value: formatProgress(Number(project.progress_percent)),
                })}
              </span>
            </div>
            {project.description ? (
              <p className="max-w-3xl text-muted-foreground">
                {project.description}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {project.factories ? (
                <span>
                  {t('projectDetail.factoryLabel', {
                    name: project.factories.name,
                    code: project.factories.code,
                  })}
                </span>
              ) : null}
              {project.assigned_pm ? (
                <span>
                  {t('projectDetail.pmLabel', {
                    name: project.assigned_pm.full_name,
                  })}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {project && projectId ? (
        <Tabs defaultValue="overview">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="overview">
              {t('projectDetail.tabs.overview')}
            </TabsTrigger>
            <TabsTrigger value="wbs">{t('projectDetail.tabs.wbs')}</TabsTrigger>
            <TabsTrigger value="kanban">
              {t('projectDetail.tabs.kanban')}
            </TabsTrigger>
            <TabsTrigger value="timeline">
              {t('projectDetail.tabs.timeline')}
            </TabsTrigger>
            <TabsTrigger value="activity">
              {t('projectDetail.tabs.activity')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <ProjectProgressOverview phases={phases} tasks={tasks} />
          </TabsContent>

          <TabsContent value="wbs" className="mt-4">
            <ProjectWbsTab
              phases={phases}
              tasksByPhase={tasksByPhase}
              canManage={canManage}
              remainingWeight={remainingWeight}
              totalWeight={totalWeight}
              weightsValid={weightsValid}
              onCreatePhase={openCreatePhase}
              onEditPhase={openEditPhase}
              onDeletePhase={handleDeletePhase}
              onCreateTask={openCreateTask}
              onEditTask={openEditTask}
              onDeleteTask={handleDeleteTask}
            />
          </TabsContent>

          <TabsContent value="kanban" className="mt-4">
            <TaskKanbanBoard
              projectId={projectId}
              phases={phases}
              tasks={tasks}
              canManage={canManage}
            />
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <ProjectTimeline project={project} phases={phases} />
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <ProjectActivityTab
              projectId={projectId}
              phaseIds={phaseIds}
              taskIds={taskIds}
              canComment={canManage || Boolean(profile)}
            />
          </TabsContent>
        </Tabs>
      ) : null}

      {project && canManage ? (
        <>
          <PhaseFormDialog
            open={phaseDialogOpen}
            onOpenChange={setPhaseDialogOpen}
            phase={editingPhase}
            remainingWeight={remainingWeight}
            onSubmit={handlePhaseSubmit}
            isSubmitting={createPhase.isPending || updatePhase.isPending}
          />
          <TaskFormDialog
            open={taskDialogOpen}
            onOpenChange={setTaskDialogOpen}
            task={editingTask}
            phaseName={activePhase?.name ?? t('common.phase')}
            factoryId={project.factory_id}
            onSubmit={handleTaskSubmit}
            isSubmitting={createTask.isPending || updateTask.isPending}
          />
        </>
      ) : null}
    </section>
  )
}
