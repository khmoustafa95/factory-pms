import { ArrowLeft, ArrowRight, Check, Lock, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CommentThread } from '@/components/comments/CommentThread'
import { ProjectTimeline } from '@/components/gantt/ProjectTimeline'
import { TaskKanbanBoard } from '@/components/kanban/TaskKanbanBoard'
import { PageHeader } from '@/components/PageHeader'
import { PhaseFormDialog } from '@/components/phases/PhaseFormDialog'
import { ProjectActivityTab } from '@/components/projects/ProjectActivityTab'
import { ProjectAttachmentsPanel } from '@/components/projects/ProjectAttachmentsPanel'
import {
  ProjectFormDialog,
  type ProjectFormSubmitPayload,
} from '@/components/projects/ProjectFormDialog'
import { ProjectRejectDialog } from '@/components/projects/ProjectRejectDialog'
import { ProjectPauseDialog } from '@/components/projects/ProjectPauseDialog'
import { ProjectStatusBadge } from '@/components/projects/ProjectStatusBadge'
import { ProjectWbsTab } from '@/components/projects/ProjectWbsTab'
import { ProjectProgressOverview } from '@/components/progress/ProjectProgressOverview'
import { TaskFormDialog } from '@/components/tasks/TaskFormDialog'
import { QueryState } from '@/components/QueryState'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
import {
  useApproveProject,
  useCompleteProjectExecution,
  usePauseProjectExecution,
  useRejectProject,
  useResumeProjectExecution,
  useStartProjectExecution,
  useUpdateProject,
} from '@/hooks/useProjects'
import { useProjectRealtime } from '@/hooks/useRealtime'
import {
  useCreateTask,
  useDeleteTask,
  useTasks,
  useUpdateTask,
  type TaskListItem,
} from '@/hooks/useTasks'
import { formatLocalizedBudget } from '@/lib/i18n-format'
import { formatProjectSchedule } from '@/lib/project-schedule'
import { getProjectScheduleBounds } from '@/lib/duration'
import { calculatePhaseMetrics } from '@/lib/phase-metrics'
import { formatProgress } from '@/lib/progress'
import { toastMutationError } from '@/lib/mutation-error'
import {
  canApproveAsDirector,
  canDiscussProposal,
  canEditProjectDetails,
  canManageProjectAttachments,
  isProposalReviewStatus,
} from '@/lib/project-status'
import { isFactoryManager, isProjectManager } from '@/lib/roles'
import type {
  ProjectPauseValues,
  ProjectRejectValues,
} from '@/lib/validations/approval'
import {
  canManagePhases,
  canManageTasks,
  canStartExecution,
  getExecutionReadiness,
  canViewWbs,
  isPhaseBudgetSumValid,
  isPhaseWeightSumValid,
  remainingPhaseBudget,
  remainingTaskBudget,
  remainingTaskWeight,
  sumPhaseExpectedBudgets,
  sumPhaseWeights,
} from '@/lib/wbs'
import type { PhaseFormValues } from '@/lib/validations/phase'
import type { TaskFormValues } from '@/lib/validations/task'
import type { Phase } from '@/types/database'

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { profile, user } = useAuth()
  const { t, locale, dir } = useTranslation()
  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft
  const {
    data: project,
    isLoading: isProjectLoading,
    error: projectError,
    refetch: refetchProject,
    isFetching: isProjectFetching,
  } = useProject(projectId)

  const isProposalMode = project
    ? isProposalReviewStatus(project.status)
    : false
  const showWbs = project ? canViewWbs(project.status) : false

  const {
    data: phases = [],
    isLoading: isPhasesLoading,
    error: phasesError,
    refetch: refetchPhases,
    isFetching: isPhasesFetching,
  } = usePhases(projectId, showWbs)
  const {
    data: tasks = [],
    isLoading: isTasksLoading,
    error: tasksError,
    refetch: refetchTasks,
    isFetching: isTasksFetching,
  } = useTasks(projectId, showWbs)
  useProjectRealtime(projectId, showWbs)

  const isWbsLoading = showWbs && (isPhasesLoading || isTasksLoading)
  const wbsError = showWbs ? (phasesError ?? tasksError) : null
  const isWbsFetching = showWbs && (isPhasesFetching || isTasksFetching)

  const refetchWbs = () => {
    void refetchPhases()
    void refetchTasks()
  }

  const createPhase = useCreatePhase(projectId)
  const updatePhase = useUpdatePhase(projectId)
  const deletePhase = useDeletePhase(projectId)
  const createTask = useCreateTask(projectId)
  const updateTask = useUpdateTask(projectId)
  const deleteTask = useDeleteTask(projectId)
  const updateProject = useUpdateProject()
  const approveProject = useApproveProject()
  const rejectProject = useRejectProject()
  const startProjectExecution = useStartProjectExecution()
  const pauseProjectExecution = usePauseProjectExecution()
  const resumeProjectExecution = useResumeProjectExecution()
  const completeProjectExecution = useCompleteProjectExecution()

  const [phaseDialogOpen, setPhaseDialogOpen] = useState(false)
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskListItem | null>(null)
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null)
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false)

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
  const totalBudget = sumPhaseExpectedBudgets(phases)
  const budgetValid = isPhaseBudgetSumValid(project?.budget, phases)
  const remainingBudget = remainingPhaseBudget(project?.budget, phases)
  const projectSchedule = useMemo(
    () => (project ? getProjectScheduleBounds(project) : null),
    [project],
  )
  const canPhases = project ? canManagePhases(project, profile) : false
  const canTasks = project ? canManageTasks(project, profile) : false
  const canManage = canPhases || canTasks
  const canStart = project ? canStartExecution(project, profile) : false
  const executionReadiness = project
    ? getExecutionReadiness(project, phases)
    : null
  const canEditDetails =
    isFactoryManager(profile?.role) &&
    Boolean(profile?.factory_id) &&
    project !== undefined &&
    canEditProjectDetails(project.status)
  const canReviewAsDirector = project
    ? canApproveAsDirector(project, profile)
    : false
  const canCommentOnProposal = canDiscussProposal(profile)
  const canManageAttachments =
    canEditDetails &&
    project !== undefined &&
    canManageProjectAttachments(project.status)
  const notAvailable = t('common.notAvailable')
  const isReviewing = approveProject.isPending || rejectProject.isPending
  const isStartingExecution = startProjectExecution.isPending
  const isPausingExecution = pauseProjectExecution.isPending
  const isResumingExecution = resumeProjectExecution.isPending
  const isCompletingExecution = completeProjectExecution.isPending

  const handleSaveProjectDetails = async ({
    values,
  }: ProjectFormSubmitPayload) => {
    if (!project) {
      return
    }

    try {
      await updateProject.mutateAsync({ id: project.id, values })
      toast.success(t('projects.updated'))
    } catch (submitError) {
      toastMutationError(submitError, t('projects.updateFailed'))
      throw submitError
    }
  }

  const handleApprove = async () => {
    if (!project || !user?.id) {
      return
    }

    try {
      await approveProject.mutateAsync({ id: project.id, userId: user.id })
      toast.success(t('projects.proposalApproved'))
    } catch (submitError) {
      toastMutationError(submitError, t('projects.approveFailed'), t)
    }
  }

  const handleReject = async (values: ProjectRejectValues) => {
    if (!project) {
      return
    }

    try {
      await rejectProject.mutateAsync({
        id: project.id,
        rejectionReason: values.rejection_reason,
      })
      toast.success(t('projects.proposalRejected'))
    } catch (submitError) {
      toastMutationError(submitError, t('projects.rejectFailed'), t)
      throw submitError
    }
  }

  const handleStartExecution = async () => {
    if (!project) {
      return
    }

    try {
      await startProjectExecution.mutateAsync({ id: project.id })
      toast.success(t('projects.executionStarted'))
    } catch (submitError) {
      toastMutationError(submitError, t('projects.startExecutionFailed'), t)
    }
  }

  const handlePauseExecution = async (values: ProjectPauseValues) => {
    if (!project) {
      return
    }

    try {
      await pauseProjectExecution.mutateAsync({
        id: project.id,
        reason: values.pause_reason,
      })
      toast.success(t('projects.executionPaused'))
    } catch (submitError) {
      toastMutationError(submitError, t('projects.pauseExecutionFailed'), t)
      throw submitError
    }
  }

  const handleResumeExecution = async () => {
    if (!project) {
      return
    }

    try {
      await resumeProjectExecution.mutateAsync({ id: project.id })
      toast.success(t('projects.executionResumed'))
    } catch (submitError) {
      toastMutationError(submitError, t('projects.resumeExecutionFailed'), t)
    }
  }

  const handleCompleteExecution = async () => {
    if (!project) {
      return
    }

    try {
      await completeProjectExecution.mutateAsync({ id: project.id })
      toast.success(t('projects.executionCompleted'))
    } catch (submitError) {
      toastMutationError(submitError, t('projects.completeExecutionFailed'), t)
    }
  }

  const getExecutionPermissionHint = (): string => {
    if (!profile || !project) {
      return t('projects.executionHintNoAccess')
    }

    if (isProjectManager(profile.role)) {
      if (!project.assigned_pm_id) {
        return t('projects.executionHintPmNotAssigned')
      }
      if (project.assigned_pm_id !== profile.id) {
        return t('projects.executionHintPmOtherAssignee')
      }
    }

    if (
      isFactoryManager(profile.role) &&
      profile.factory_id &&
      project.factory_id !== profile.factory_id
    ) {
      return t('projects.executionHintFactoryScope')
    }

    return t('projects.executionHintNoAccess')
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
      toastMutationError(submitError, t('projectDetail.savePhaseFailed'))
      throw submitError
    }
  }

  const handleDeletePhase = async (phase: Phase) => {
    try {
      await deletePhase.mutateAsync(phase.id)
      toast.success(t('projectDetail.phaseDeleted'))
    } catch (submitError) {
      toastMutationError(submitError, t('projectDetail.deletePhaseFailed'))
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
      toastMutationError(submitError, t('projectDetail.saveTaskFailed'))
      throw submitError
    }
  }

  const handleDeleteTask = async (task: TaskListItem) => {
    try {
      await deleteTask.mutateAsync(task.id)
      toast.success(t('projectDetail.taskDeleted'))
    } catch (submitError) {
      toastMutationError(submitError, t('projectDetail.deleteTaskFailed'))
    }
  }

  const activePhase = phases.find((phase) => phase.id === activePhaseId) ?? null
  const activePhaseTasks = activePhaseId
    ? (tasksByPhase.get(activePhaseId) ?? [])
    : []
  const editingPhaseTasks = editingPhase
    ? (tasksByPhase.get(editingPhase.id) ?? [])
    : []
  const editingPhaseMetrics = editingPhase
    ? calculatePhaseMetrics(editingPhase, editingPhaseTasks)
    : null
  const taskRemainingWeight = remainingTaskWeight(
    activePhaseTasks,
    editingTask?.id,
  )
  const taskRemainingBudget = activePhase
    ? remainingTaskBudget(
        Number(activePhase.expected_budget),
        activePhaseTasks,
        editingTask?.id,
      )
    : undefined
  return (
    <section className="space-y-6">
      <QueryState
        isLoading={isProjectLoading}
        error={projectError}
        loadingMessage={t('projectDetail.loading')}
        errorMessage={t('projectDetail.loadFailed')}
        onRetry={() => void refetchProject()}
        isRetrying={isProjectFetching}
      >
        {project ? (
          <PageHeader
            leading={
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="-ms-2 h-8 w-fit text-muted-foreground"
              >
                <Link to="/projects">
                  <BackIcon className="size-4" />
                  {t('projectDetail.backToProjects')}
                </Link>
              </Button>
            }
            title={
              <span className="flex flex-wrap items-center gap-3">
                <span>{project.title}</span>
                <ProjectStatusBadge status={project.status} />
                {showWbs ? (
                  <span className="text-sm font-normal text-muted-foreground">
                    {t('projectDetail.progressLabel', {
                      value: formatProgress(Number(project.progress_percent)),
                    })}
                  </span>
                ) : null}
              </span>
            }
            actions={
              <div className="flex flex-wrap gap-2">
                {canReviewAsDirector ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isReviewing}
                      onClick={() => void handleApprove()}
                    >
                      <Check className="size-4" />
                      {t('common.approve')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={isReviewing}
                      onClick={() => setRejectDialogOpen(true)}
                    >
                      <X className="size-4" />
                      {t('common.reject')}
                    </Button>
                  </>
                ) : null}
                {canEditDetails ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setProjectDialogOpen(true)}
                  >
                    {t('common.edit')}
                  </Button>
                ) : null}
                {canStart && project.status === 'approved' ? (
                  executionReadiness?.ready ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void handleStartExecution()}
                      disabled={isStartingExecution}
                    >
                      {t('common.startExecution')}
                    </Button>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled
                            >
                              <Lock className="size-4" />
                              {t('common.startExecution')}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent sideOffset={6}>
                          <ul className="list-disc space-y-1 ps-4">
                            {(executionReadiness?.reasons ?? []).map(
                              (reason) => (
                                <li key={reason}>
                                  {t(`projects.executionNotReady.${reason}`)}
                                </li>
                              ),
                            )}
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )
                ) : null}
                {canManage && project.status === 'in_progress' ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setPauseDialogOpen(true)}
                      disabled={isPausingExecution}
                    >
                      {t('common.pauseExecution')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void handleCompleteExecution()}
                      disabled={isCompletingExecution}
                    >
                      {t('common.completeExecution')}
                    </Button>
                  </>
                ) : null}
                {canManage && project.status === 'paused' ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleResumeExecution()}
                    disabled={isResumingExecution}
                  >
                    {t('common.resumeExecution')}
                  </Button>
                ) : null}
                {!canManage &&
                !canStart &&
                (project.status === 'approved' ||
                  project.status === 'in_progress' ||
                  project.status === 'paused') ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled
                        >
                          <Lock className="size-4" />
                          {t('projects.executionActionsLocked')}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent sideOffset={6}>
                        {getExecutionPermissionHint()}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : null}
              </div>
            }
            description={
              <span className="flex flex-col gap-2">
                {project.description ? (
                  <span>{project.description}</span>
                ) : null}
                {project.status === 'proposed' ? (
                  <span className="text-sm text-muted-foreground">
                    {t('projects.awaitingDirectorReview')}
                  </span>
                ) : null}
                {project.status === 'rejected' && project.rejection_reason ? (
                  <span className="text-sm text-destructive">
                    {t('projects.rejectedPrefix')} {project.rejection_reason}
                  </span>
                ) : null}
                <span className="flex flex-wrap gap-x-4 gap-y-1">
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
                </span>
              </span>
            }
          />
        ) : null}
      </QueryState>

      {project && projectId && isProposalMode ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('projects.proposalSummary')}</CardTitle>
              <CardDescription>{t('projects.formDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  {t('common.budget')}
                </span>
                <span className="font-medium">
                  {formatLocalizedBudget(
                    project.budget,
                    project.currency,
                    locale,
                    notAvailable,
                  )}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  {t('common.timeline')}
                </span>
                <span className="font-medium">
                  {formatProjectSchedule(project, locale, t, notAvailable)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  {t('projects.pm')}
                </span>
                <span className="font-medium">
                  {project.assigned_pm?.full_name ?? notAvailable}
                </span>
              </div>
            </CardContent>
          </Card>

          <ProjectAttachmentsPanel
            projectId={projectId}
            canManage={canManageAttachments}
          />

          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('projects.proposalDiscussion')}</CardTitle>
                <CardDescription>
                  {t('projects.proposalDiscussionDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!canCommentOnProposal ? (
                  <p className="text-sm text-muted-foreground">
                    {t('projects.discussionParticipantsOnly')}
                  </p>
                ) : null}
                <CommentThread
                  entityType="project"
                  entityId={projectId}
                  title=""
                  canComment={canCommentOnProposal}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {project && projectId && showWbs ? (
        <QueryState
          isLoading={isWbsLoading}
          error={wbsError}
          loadingMessage={t('common.loading')}
          errorMessage={t('projectDetail.loadFailed')}
          onRetry={refetchWbs}
          isRetrying={isWbsFetching}
        >
          <Tabs defaultValue="overview" dir={dir}>
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="overview">
                {t('projectDetail.tabs.overview')}
              </TabsTrigger>
              <TabsTrigger value="wbs">
                {t('projectDetail.tabs.wbs')}
              </TabsTrigger>
              <TabsTrigger value="kanban">
                {t('projectDetail.tabs.kanban')}
              </TabsTrigger>
              <TabsTrigger value="timeline">
                {t('projectDetail.tabs.timeline')}
              </TabsTrigger>
              <TabsTrigger value="activity">
                {t('projectDetail.tabs.activity')}
              </TabsTrigger>
              <TabsTrigger value="attachments">
                {t('projects.attachments.title')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <ProjectProgressOverview phases={phases} tasks={tasks} />
            </TabsContent>

            <TabsContent value="wbs" className="mt-4">
              <ProjectWbsTab
                phases={phases}
                tasksByPhase={tasksByPhase}
                canManagePhases={canPhases}
                canManageTasks={canTasks}
                remainingWeight={remainingWeight}
                totalWeight={totalWeight}
                weightsValid={weightsValid}
                remainingBudget={remainingBudget}
                totalBudget={totalBudget}
                budgetValid={budgetValid}
                projectBudget={project.budget}
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
                canManage={canTasks}
              />
            </TabsContent>

            <TabsContent value="timeline" className="mt-4">
              <ProjectTimeline project={project} phases={phases} />
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <ProjectActivityTab
                projectId={projectId}
                canComment={canManage}
              />
            </TabsContent>

            <TabsContent value="attachments" className="mt-4">
              <ProjectAttachmentsPanel
                projectId={projectId}
                canManage={canManageAttachments}
              />
            </TabsContent>
          </Tabs>
        </QueryState>
      ) : null}

      {project && canEditDetails ? (
        <ProjectFormDialog
          open={projectDialogOpen}
          onOpenChange={setProjectDialogOpen}
          project={project}
          factoryId={project.factory_id}
          allowSubmitProposal={false}
          onSaveDraft={handleSaveProjectDetails}
          onSubmitProposal={handleSaveProjectDetails}
          isSubmitting={updateProject.isPending}
        />
      ) : null}

      {canReviewAsDirector ? (
        <ProjectRejectDialog
          open={rejectDialogOpen}
          onOpenChange={setRejectDialogOpen}
          projectTitle={project?.title ?? null}
          onSubmit={handleReject}
          isSubmitting={rejectProject.isPending}
        />
      ) : null}

      {project && canManage ? (
        <ProjectPauseDialog
          open={pauseDialogOpen}
          onOpenChange={setPauseDialogOpen}
          projectTitle={project.title}
          onSubmit={handlePauseExecution}
          isSubmitting={pauseProjectExecution.isPending}
        />
      ) : null}

      {project && canPhases ? (
        <PhaseFormDialog
          open={phaseDialogOpen}
          onOpenChange={setPhaseDialogOpen}
          phase={editingPhase}
          remainingWeight={remainingWeight}
          remainingBudget={remainingBudget}
          projectBudget={project.budget}
          schedule={
            projectSchedule ?? {
              start: null,
              end: null,
              durationDays: null,
              hasFixedDates: false,
            }
          }
          actualCostTotal={editingPhaseMetrics?.actualCost ?? 0}
          scheduleDeviationDays={
            editingPhaseMetrics?.scheduleDeviationDays ?? null
          }
          onSubmit={handlePhaseSubmit}
          isSubmitting={createPhase.isPending || updatePhase.isPending}
        />
      ) : null}

      {project && canTasks ? (
        <TaskFormDialog
          open={taskDialogOpen}
          onOpenChange={setTaskDialogOpen}
          task={editingTask}
          phaseName={activePhase?.name ?? t('common.phase')}
          phaseStartDate={activePhase?.start_date ?? null}
          phaseEndDate={activePhase?.end_date ?? null}
          remainingWeight={taskRemainingWeight}
          remainingBudget={taskRemainingBudget}
          onSubmit={handleTaskSubmit}
          isSubmitting={createTask.isPending || updateTask.isPending}
        />
      ) : null}
    </section>
  )
}
