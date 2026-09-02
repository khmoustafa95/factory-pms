import { ArrowLeft, ArrowRight, Check, Lock, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CommentThread } from '@/components/comments/CommentThread'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { PageHeaderActions } from '@/components/PageHeaderActions'
import { ScrollableTabsList } from '@/components/ScrollableTabsList'
import { ProjectTimeline } from '@/components/gantt/ProjectTimeline'
import { TaskKanbanBoard } from '@/components/kanban/TaskKanbanBoard'
import { PageHeader } from '@/components/PageHeader'
import { QueryState } from '@/components/QueryState'
import { PhaseFormDialog } from '@/components/phases/PhaseFormDialog'
import { ProjectActivityTab } from '@/components/projects/ProjectActivityTab'
import { ProjectApproveDialog } from '@/components/projects/ProjectApproveDialog'
import { ProjectAttachmentsPanel } from '@/components/projects/ProjectAttachmentsPanel'
import { ProjectChangeRequestDialog } from '@/components/projects/ProjectChangeRequestDialog'
import { ProjectChangeRequestsPanel } from '@/components/projects/ProjectChangeRequestsPanel'
import { ProjectCompleteDialog } from '@/components/projects/ProjectCompleteDialog'
import { ProjectFinancePanel } from '@/components/projects/ProjectFinancePanel'
import {
  ProjectFormDialog,
  type ProjectFormSubmitPayload,
} from '@/components/projects/ProjectFormDialog'
import { ProjectRejectDialog } from '@/components/projects/ProjectRejectDialog'
import { ProjectPauseDialog } from '@/components/projects/ProjectPauseDialog'
import { ProjectReassignPmDialog } from '@/components/projects/ProjectReassignPmDialog'
import { ProjectStartExecutionDialog } from '@/components/projects/ProjectStartExecutionDialog'
import { ProjectStatusBadge } from '@/components/projects/ProjectStatusBadge'
import { ProjectWbsTab } from '@/components/projects/ProjectWbsTab'
import { ProjectProgressOverview } from '@/components/progress/ProjectProgressOverview'
import { TaskFormDialog } from '@/components/tasks/TaskFormDialog'
import { StatusMessage } from '@/components/StatusMessage'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/contexts/LocaleContext'
import { useConfirmAction } from '@/hooks/useConfirmAction'
import { useProjectDetailTab } from '@/hooks/useProjectDetailTab'
import { useProjectAttachments } from '@/hooks/useProjectAttachments'
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
  useFactoryProjectManagers,
  usePauseProjectExecution,
  useRejectProject,
  useResumeProjectExecution,
  useStartProjectExecution,
  useUpdateProject,
} from '@/hooks/useProjects'
import {
  useProjectChangeRequests,
  useReassignProjectPm,
  useRequestProjectChange,
  useRequestProjectCompletion,
  useReviewProjectChange,
} from '@/hooks/useProjectGovernance'
import { useProjectFinancialSnapshot } from '@/hooks/useProjectFinancialSnapshot'
import { useProjectFunding } from '@/hooks/useProjectFunding'
import { useProjectProcurement } from '@/hooks/useProjectProcurement'
import { sumStaffHeadcount, useProjectStaff } from '@/hooks/useProjectStaff'
import { useProjectRealtime } from '@/hooks/useRealtime'
import {
  useCreateTask,
  useDeleteTask,
  useTasks,
  useUpdateTask,
  type TaskListItem,
} from '@/hooks/useTasks'
import { formatLocalizedBudget } from '@/lib/i18n-format'
import { todayDateOnly } from '@/lib/date-only'
import { formatProjectSchedule } from '@/lib/project-schedule'
import { getProjectScheduleBounds } from '@/lib/duration'
import { calculatePhaseMetrics } from '@/lib/phase-metrics'
import { formatProgress } from '@/lib/progress'
import {
  canManageProjectFunding,
  canManageProjectOperations,
  canViewProjectFinance,
  countOpenProcurement,
} from '@/lib/project-finance'
import { toastMutationError } from '@/lib/mutation-error'
import {
  buildProjectPath,
  isCanonicalProjectPath,
  parseProjectRouteParams,
} from '@/lib/project-routes'
import {
  canApproveAsDirector,
  canCommentOnProject,
  canDiscussProposal,
  canEditProjectDetails,
  canManageProjectAttachments,
  canRequestProjectChange,
  isProposalReviewStatus,
} from '@/lib/project-status'
import { isFactoryManager } from '@/lib/roles'
import type { ChangeRequestFormValues } from '@/lib/validations/governance'
import type { ReassignPmFormValues } from '@/lib/validations/governance'
import type {
  ProjectPauseValues,
  ProjectRejectValues,
} from '@/lib/validations/approval'
import {
  canConfirmCompletion,
  canGovernExecution,
  canManagePhases,
  canManageTasks,
  canReassignProjectPm,
  canRequestCompletion,
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
  const { factoryCode, projectCode, projectRef } = useParams<{
    factoryCode?: string
    projectCode?: string
    projectRef?: string
  }>()
  const location = useLocation()
  const routeRef = useMemo(
    () =>
      parseProjectRouteParams({
        factoryCode,
        projectCode,
        projectRef,
      }),
    [factoryCode, projectCode, projectRef],
  )
  const { profile, user } = useAuth()
  const { t, locale, dir } = useTranslation()
  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft
  const {
    data: project,
    isLoading: isProjectLoading,
    error: projectError,
    refetch: refetchProject,
    isFetching: isProjectFetching,
  } = useProject(routeRef)
  const projectId = project?.id

  const isProposalMode = project
    ? isProposalReviewStatus(project.status)
    : false
  const showWbs = project ? canViewWbs(project.status) : false

  const showFinance = project
    ? canViewProjectFinance(project, profile)
    : false
  const canManageFunding = project
    ? canManageProjectFunding(project, profile)
    : false
  const canManageOperations = project
    ? canManageProjectOperations(project, profile)
    : false

  const {
    data: financialSnapshot,
  } = useProjectFinancialSnapshot(
    projectId,
    Boolean(projectId) && (showWbs || isProposalMode),
  )
  const { data: proposalFunding = [] } = useProjectFunding(
    projectId,
    isProposalMode,
  )
  const { data: proposalProcurement = [] } = useProjectProcurement(
    projectId,
    isProposalMode || showWbs,
  )
  const { data: proposalStaff = [] } = useProjectStaff(projectId, isProposalMode)

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
  const requestCompletion = useRequestProjectCompletion()
  const requestChange = useRequestProjectChange(projectId)
  const reviewChange = useReviewProjectChange(projectId)
  const reassignPm = useReassignProjectPm()
  const { data: changeRequests = [] } = useProjectChangeRequests(
    projectId,
    Boolean(projectId) && showWbs,
  )
  const { data: factoryManagers = [] } = useFactoryProjectManagers(
    project?.factory_id,
  )

  const [phaseDialogOpen, setPhaseDialogOpen] = useState(false)
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskListItem | null>(null)
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null)
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [startDialogOpen, setStartDialogOpen] = useState(false)
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [changeDialogOpen, setChangeDialogOpen] = useState(false)
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false)
  const { close, handleConfirm, state: confirmState } = useConfirmAction()
  const [activeTab, setActiveTab] = useProjectDetailTab(showFinance)
  const { data: proposalAttachments = [] } = useProjectAttachments(
    isProposalMode ? projectId : undefined,
  )

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

  const blockedTaskCount = tasks.filter((task) => task.status === 'blocked').length
  const overdueTaskCount = tasks.filter((task) => {
    if (task.status === 'done' || !task.due_date?.trim()) {
      return false
    }
    return task.due_date < todayDateOnly()
  }).length
  const proposalFundingTotal = proposalFunding.reduce(
    (sum, entry) => sum + Number(entry.amount),
    0,
  )

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
  const canGovern = project ? canGovernExecution(project, profile) : false
  const canStart = project ? canStartExecution(project, profile) : false
  const canRequestClose = project
    ? canRequestCompletion(project, profile)
    : false
  const canConfirmClose = canConfirmCompletion(profile)
  const executionReadiness = project
    ? getExecutionReadiness(project, phases)
    : null
  const canEditDetails =
    isFactoryManager(profile?.role) &&
    Boolean(profile?.factory_id) &&
    project !== undefined &&
    canEditProjectDetails(project.status)
  const canReassignPm = project
    ? canReassignProjectPm(project, profile)
    : false
  const canRequestChange =
    project !== undefined &&
    canRequestProjectChange(project.status) &&
    (canReassignPm || canPhases || canTasks)
  const canReviewAsDirector = project
    ? canApproveAsDirector(project, profile)
    : false
  const canCommentOnProposal = canDiscussProposal(profile)
  const canCommentOnExecution = project
    ? canCommentOnProject(project.status, profile)
    : false
  const canManageAttachments =
    project !== undefined &&
    canManageProjectAttachments(project.status, profile)
  const openProcurementCount = countOpenProcurement(proposalProcurement)
  const allTasksDone =
    tasks.length > 0 && tasks.every((task) => task.status === 'done')
  const notAvailable = t('common.notAvailable')
  const isReviewing = approveProject.isPending || rejectProject.isPending
  const isStartingExecution = startProjectExecution.isPending
  const isPausingExecution = pauseProjectExecution.isPending
  const isResumingExecution = resumeProjectExecution.isPending
  const isCompletingExecution =
    completeProjectExecution.isPending || requestCompletion.isPending

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
      if (canConfirmClose) {
        await completeProjectExecution.mutateAsync({ id: project.id })
        toast.success(t('projects.executionCompleted'))
      } else {
        await requestCompletion.mutateAsync({ id: project.id })
        toast.success(t('projects.completionRequested'))
      }
    } catch (submitError) {
      toastMutationError(
        submitError,
        canConfirmClose
          ? t('projects.completeExecutionFailed')
          : t('projects.completionRequestFailed'),
        t,
      )
    }
  }

  const handleChangeRequest = async (values: ChangeRequestFormValues) => {
    try {
      await requestChange.mutateAsync({
        kind: values.change_kind,
        reason: values.reason,
        requestedBudget:
          values.change_kind === 'budget'
            ? Number(values.requested_budget)
            : undefined,
        requestedStartDate:
          values.change_kind === 'schedule'
            ? values.requested_start_date
            : undefined,
        requestedEndDate:
          values.change_kind === 'schedule'
            ? values.requested_end_date
            : undefined,
      })
      toast.success(t('projects.changeRequest.submitted'))
    } catch (submitError) {
      toastMutationError(
        submitError,
        t('projects.changeRequest.submitFailed'),
        t,
      )
      throw submitError
    }
  }

  const handleReassignPm = async (values: ReassignPmFormValues) => {
    if (!project) {
      return
    }

    try {
      await reassignPm.mutateAsync({
        id: project.id,
        pmId: values.assigned_pm_id,
        reason: values.reason,
      })
      toast.success(t('projects.reassignPm.updated'))
    } catch (submitError) {
      toastMutationError(submitError, t('projects.reassignPm.failed'), t)
      throw submitError
    }
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

  const canonicalRedirect =
    project &&
    !isCanonicalProjectPath(location.pathname) &&
    project.factories?.code
      ? `${buildProjectPath(project)}${location.search}`
      : null

  if (canonicalRedirect) {
    return <Navigate to={canonicalRedirect} replace />
  }

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
              <PageHeaderActions
                primary={
                  canReviewAsDirector
                    ? {
                        id: 'approve',
                        label: (
                          <>
                            <Check className="size-4" />
                            {t('common.approve')}
                          </>
                        ),
                        disabled: isReviewing,
                        onClick: () => setApproveDialogOpen(true),
                      }
                    : canStart && project.status === 'approved'
                      ? executionReadiness?.ready
                        ? {
                            id: 'start',
                            label: t('common.startExecution'),
                            disabled: isStartingExecution,
                            onClick: () => setStartDialogOpen(true),
                          }
                        : null
                      : (canConfirmClose || canRequestClose) &&
                          (project.status === 'in_progress' ||
                            project.status === 'paused') &&
                          !(
                            canGovern &&
                            project.status === 'paused' &&
                            !canConfirmClose
                          )
                        ? {
                            id: 'complete',
                            label: canConfirmClose
                              ? t('common.completeExecution')
                              : t('projects.completeDialog.requestAction'),
                            disabled:
                              isCompletingExecution ||
                              Boolean(
                                !canConfirmClose &&
                                  project.completion_requested_at,
                              ),
                            onClick: () => setCompleteDialogOpen(true),
                          }
                        : canGovern && project.status === 'paused'
                          ? {
                              id: 'resume',
                              label: t('common.resumeExecution'),
                              disabled: isResumingExecution,
                              onClick: () => void handleResumeExecution(),
                            }
                          : null
                }
                secondary={[
                  {
                    id: 'reject',
                    label: (
                      <>
                        <X className="size-4" />
                        {t('common.reject')}
                      </>
                    ),
                    destructive: true,
                    disabled: isReviewing,
                    hidden: !canReviewAsDirector,
                    onClick: () => setRejectDialogOpen(true),
                  },
                  {
                    id: 'edit',
                    label: t('common.edit'),
                    hidden: !canEditDetails,
                    onClick: () => setProjectDialogOpen(true),
                  },
                  {
                    id: 'reassign-pm',
                    label: t('projects.reassignPm.action'),
                    hidden: !canReassignPm,
                    onClick: () => setReassignDialogOpen(true),
                  },
                  {
                    id: 'change-request',
                    label: t('projects.changeRequest.action'),
                    hidden: !canRequestChange,
                    onClick: () => setChangeDialogOpen(true),
                  },
                  {
                    id: 'start-locked',
                    label: (
                      <>
                        <Lock className="size-4" />
                        {t('common.startExecution')}
                      </>
                    ),
                    disabled: true,
                    hidden: !(
                      canStart &&
                      project.status === 'approved' &&
                      !executionReadiness?.ready
                    ),
                  },
                  {
                    id: 'pause',
                    label: t('common.pauseExecution'),
                    disabled: isPausingExecution,
                    hidden: !(canGovern && project.status === 'in_progress'),
                    onClick: () => setPauseDialogOpen(true),
                  },
                  {
                    id: 'resume',
                    label: t('common.resumeExecution'),
                    disabled: isResumingExecution,
                    hidden: !(
                      canGovern &&
                      project.status === 'paused' &&
                      (canConfirmClose || canRequestClose)
                    ),
                    onClick: () => void handleResumeExecution(),
                  },
                  {
                    id: 'locked-hint',
                    label: (
                      <>
                        <Lock className="size-4" />
                        {t('projects.executionActionsLocked')}
                      </>
                    ),
                    disabled: true,
                    hidden: !(
                      !canGovern &&
                      !canStart &&
                      !canConfirmClose &&
                      !canRequestClose &&
                      (project.status === 'approved' ||
                        project.status === 'in_progress' ||
                        project.status === 'paused')
                    ),
                  },
                ]}
              />
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
                {project.completion_requested_at ? (
                  <StatusMessage variant="info">
                    {t('projects.completionRequestedBanner')}
                  </StatusMessage>
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
                  {t('projects.proposalSummaryFunding')}
                </span>
                <span className="font-medium">
                  {formatLocalizedBudget(
                    proposalFunding
                      .filter((entry) => entry.status === 'received')
                      .reduce((sum, entry) => sum + Number(entry.amount), 0),
                    project.currency,
                    locale,
                    notAvailable,
                  )}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  {t('projects.proposalSummaryStaff')}
                </span>
                <span className="font-medium">
                  {sumStaffHeadcount(proposalStaff)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  {t('projects.proposalSummaryProcurement')}
                </span>
                <span className="font-medium">
                  {countOpenProcurement(proposalProcurement)}
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
                  projectId={projectId}
                  title=""
                  canComment={canCommentOnProposal}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {project && projectId && isProposalMode && showFinance ? (
        <ProjectFinancePanel
          projectId={projectId}
          currency={project.currency}
          canManageFunding={canManageFunding}
          canManageOperations={canManageOperations}
          phases={[]}
        />
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
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} dir={dir}>
            <ScrollableTabsList>
              <TabsTrigger value="overview">
                {t('projectDetail.tabs.overview')}
              </TabsTrigger>
              {showFinance ? (
                <TabsTrigger value="finance">
                  {t('projectDetail.tabs.finance')}
                </TabsTrigger>
              ) : null}
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
            </ScrollableTabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <ProjectChangeRequestsPanel
                requests={changeRequests}
                currency={project.currency}
                canReview={canConfirmClose}
                onReview={async (requestId, approve, reason) => {
                  await reviewChange.mutateAsync({
                    requestId,
                    approve,
                    reason,
                  })
                }}
                isReviewing={reviewChange.isPending}
              />
              <ProjectProgressOverview
                phases={phases}
                tasks={tasks}
                snapshot={financialSnapshot}
              />
            </TabsContent>

            {showFinance ? (
              <TabsContent value="finance" className="mt-4">
                <ProjectFinancePanel
                  projectId={projectId}
                  currency={project.currency}
                  canManageFunding={canManageFunding}
                  canManageOperations={canManageOperations}
                  phases={phases}
                />
              </TabsContent>
            ) : null}

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
                canComment={canCommentOnExecution}
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

      {canReviewAsDirector && project ? (
        <ProjectApproveDialog
          open={approveDialogOpen}
          onOpenChange={setApproveDialogOpen}
          project={project}
          pmName={
            project.assigned_pm?.full_name ?? t('common.unassigned')
          }
          attachmentCount={proposalAttachments.length}
          fundingTotal={proposalFundingTotal}
          onConfirm={handleApprove}
          isSubmitting={approveProject.isPending}
        />
      ) : null}

      {canStart && project ? (
        <ProjectStartExecutionDialog
          open={startDialogOpen}
          onOpenChange={setStartDialogOpen}
          project={project}
          pmName={project.assigned_pm?.full_name ?? t('common.unassigned')}
          fundingReceived={Number(financialSnapshot?.funding_received ?? 0)}
          readinessReasons={executionReadiness?.reasons ?? []}
          onConfirm={handleStartExecution}
          isSubmitting={startProjectExecution.isPending}
        />
      ) : null}

      {(canRequestClose || canConfirmClose) && project ? (
        <ProjectCompleteDialog
          open={completeDialogOpen}
          onOpenChange={setCompleteDialogOpen}
          mode={canConfirmClose ? 'confirm' : 'request'}
          projectTitle={project.title}
          allTasksDone={allTasksDone}
          blockedCount={blockedTaskCount}
          overdueCount={overdueTaskCount}
          openProcurementCount={openProcurementCount}
          onConfirm={handleCompleteExecution}
          isSubmitting={isCompletingExecution}
        />
      ) : null}

      {canRequestChange && project ? (
        <ProjectChangeRequestDialog
          open={changeDialogOpen}
          onOpenChange={setChangeDialogOpen}
          currentBudget={project.budget}
          currentStart={project.proposed_start_date}
          currentEnd={project.proposed_end_date}
          onSubmit={handleChangeRequest}
          isSubmitting={requestChange.isPending}
        />
      ) : null}

      {canReassignPm && project ? (
        <ProjectReassignPmDialog
          open={reassignDialogOpen}
          onOpenChange={setReassignDialogOpen}
          currentPmId={project.assigned_pm_id}
          managers={factoryManagers}
          onSubmit={handleReassignPm}
          isSubmitting={reassignPm.isPending}
        />
      ) : null}

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        cancelLabel={confirmState.cancelLabel}
        variant={confirmState.variant}
        isLoading={confirmState.isLoading}
        onOpenChange={(open) => {
          if (!open) {
            close()
          }
        }}
        onConfirm={handleConfirm}
      />

      {canReviewAsDirector ? (
        <ProjectRejectDialog
          open={rejectDialogOpen}
          onOpenChange={setRejectDialogOpen}
          projectTitle={project?.title ?? null}
          onSubmit={handleReject}
          isSubmitting={rejectProject.isPending}
        />
      ) : null}

      {project && canGovern ? (
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
