import { Check, Download, Eye, Layers, Lock, Plus, Send, Upload, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PaginatedListPage } from '@/components/PaginatedListPage'
import { PageHeaderActions } from '@/components/PageHeaderActions'
import { Badge } from '@/components/ui/badge'
import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog'
import { ProjectImportDialog } from '@/components/projects/ProjectImportDialog'
import { ProjectConsultationDialog } from '@/components/projects/ProjectConsultationDialog'
import { ProjectPauseDialog } from '@/components/projects/ProjectPauseDialog'
import { ProjectStartExecutionDialog } from '@/components/projects/ProjectStartExecutionDialog'
import { ProjectRejectDialog } from '@/components/projects/ProjectRejectDialog'
import { ProjectStatusBadge } from '@/components/projects/ProjectStatusBadge'
import { ListToolbar } from '@/components/ListToolbar'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/contexts/LocaleContext'
import { uploadProjectAttachments } from '@/hooks/useProjectAttachments'
import { queryKeys } from '@/lib/query-keys'
import {
  useApproveProject,
  useCompleteConsultation,
  useCompleteProjectExecution,
  useCreateProject,
  usePauseProjectExecution,
  useProjectsPage,
  useRejectProject,
  useResumeProjectExecution,
  useStartProjectExecution,
  useSubmitProject,
  useUpdateConsultationOpinions,
  useUpdateProject,
  type ProjectListItem,
} from '@/hooks/useProjects'
import { useRequestProjectCompletion } from '@/hooks/useProjectGovernance'
import { usePhases } from '@/hooks/usePhases'
import { useTasks } from '@/hooks/useTasks'
import { useFactories } from '@/hooks/useFactories'
import { useListQueryState } from '@/hooks/useListQueryState'
import type { ProjectsPageParams } from '@/lib/list-query-params'
import { formatProjectSchedule } from '@/lib/project-schedule'
import { buildProjectPath } from '@/lib/project-routes'
import {
  formatLocalizedBudget,
  formatFactoryLabel,
  getProjectPriorityLabel,
  getProjectStatusLabel,
} from '@/lib/i18n-format'
import { buildFactoryFilterOptions } from '@/lib/list-filters'
import { toastMutationError } from '@/lib/mutation-error'
import { downloadSpreadsheet } from '@/lib/export-spreadsheet'
import { deriveFundingStatus } from '@/lib/project-finance'
import { formatProgress } from '@/lib/progress'
import {
  canApproveAsDirector,
  canCompleteConsultation,
  canEditProjectDetails,
  canReviewProject,
  canSubmitProject,
  isProposalReviewStatus,
} from '@/lib/project-status'
import type {
  ProjectPauseValues,
  ProjectRejectValues,
} from '@/lib/validations/approval'
import type { ConsultationOpinionsFormValues } from '@/lib/validations/project'
import {
  canConfirmCompletion,
  canGovernExecution,
  canRequestCompletion,
  canStartExecution,
  canViewWbs,
  getExecutionReadiness,
} from '@/lib/wbs'
import { isCompanyDirector, isFactoryManager, canControl } from '@/lib/roles'
import type { ProjectFormSubmitPayload } from '@/components/projects/ProjectFormDialog'
import type { Project, ProjectStatus } from '@/types/database'

const PROJECT_STATUS_FILTERS: ProjectStatus[] = [
  'draft',
  'consultation',
  'proposed',
  'approved',
  'rejected',
  'in_progress',
  'completed',
  'paused',
]

export function ProjectsPage() {
  const { t, locale } = useTranslation()
  const { profile, user } = useAuth()
  const queryClient = useQueryClient()
  const listState = useListQueryState({ status: 'all', factoryId: 'all' })
  const { data: factories = [] } = useFactories()
  const { data, isLoading, error, refetch, isFetching } = useProjectsPage({
    page: listState.page,
    pageSize: listState.pageSize,
    search: listState.debouncedSearch,
    status: listState.filters.status as ProjectsPageParams['status'],
    factoryId: listState.filters.factoryId,
  })
  const projects = data?.items ?? []
  const total = data?.total ?? 0
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const submitProject = useSubmitProject()
  const approveProject = useApproveProject()
  const rejectProject = useRejectProject()
  const updateConsultationOpinions = useUpdateConsultationOpinions()
  const completeConsultation = useCompleteConsultation()
  const startProjectExecution = useStartProjectExecution()
  const pauseProjectExecution = usePauseProjectExecution()
  const resumeProjectExecution = useResumeProjectExecution()
  const completeProjectExecution = useCompleteProjectExecution()
  const requestCompletion = useRequestProjectCompletion()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [consultationDialogOpen, setConsultationDialogOpen] = useState(false)
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [rejectingProject, setRejectingProject] =
    useState<ProjectListItem | null>(null)
  const [consultingProject, setConsultingProject] =
    useState<ProjectListItem | null>(null)
  const [pausingProject, setPausingProject] = useState<ProjectListItem | null>(
    null,
  )
  const [startingProject, setStartingProject] =
    useState<ProjectListItem | null>(null)
  const { data: startingPhases = [] } = usePhases(startingProject?.id)
  const { data: startingTasks = [] } = useTasks(startingProject?.id)
  const startingReadiness = startingProject
    ? getExecutionReadiness(startingProject, startingPhases)
    : null
  const [searchParams, setSearchParams] = useSearchParams()

  const isDirector = isCompanyDirector(profile?.role)
  const isManager = isFactoryManager(profile?.role)
  const hasControl = canControl(profile)
  const canManageProposals =
    isManager && hasControl && Boolean(profile?.factory_id)
  const canImportProjects = isDirector && hasControl
  const shouldOpenCreateFromUrl =
    searchParams.get('action') === 'new' && canManageProposals
  const isCreateDialogOpen = dialogOpen || shouldOpenCreateFromUrl

  const handleCreateDialogOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open && shouldOpenCreateFromUrl) {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current)
          params.delete('action')
          return params
        },
        { replace: true },
      )
    }
  }
  const notAvailable = t('common.notAvailable')

  const formatBudgetUsed = (project: ProjectListItem) =>
    project.budget_used_pct != null
      ? `${project.budget_used_pct.toFixed(0)}%`
      : notAvailable

  const formatFundingStatus = (project: ProjectListItem) => {
    const status = deriveFundingStatus(
      project.budget,
      project.funding_received ?? 0,
    )
    return t(`projects.fundingStatusLabels.${status}`)
  }

  const handleExport = () => {
    if (projects.length === 0) {
      toast.error(t('list.exportEmpty'))
      return
    }

    try {
      downloadSpreadsheet(
        `projects-${new Date().toISOString().slice(0, 10)}`,
        [
          { header: t('common.code'), value: (row) => row.code },
          { header: t('common.title'), value: (row) => row.title },
          {
            header: t('common.factory'),
            value: (row) =>
              row.factories ? formatFactoryLabel(row.factories) : '',
          },
          {
            header: t('common.status'),
            value: (row) => getProjectStatusLabel(t, row.status),
          },
          {
            header: t('common.progress'),
            value: (row) => formatProgress(row.progress_percent),
          },
          {
            header: t('common.budget'),
            value: (row) =>
              formatLocalizedBudget(
                row.budget,
                row.currency,
                locale,
                notAvailable,
              ),
          },
          {
            header: t('projects.budgetUsed'),
            value: (row) => formatBudgetUsed(row),
          },
          {
            header: t('projects.fundingStatus'),
            value: (row) => formatFundingStatus(row),
          },
          {
            header: t('projects.priority'),
            value: (row) => getProjectPriorityLabel(t, row.priority, ''),
          },
          {
            header: t('projects.announcementDate'),
            value: (row) => row.announcement_date ?? '',
          },
          {
            header: t('projects.announcingEntity'),
            value: (row) => row.announcing_entity ?? '',
          },
          {
            header: t('projects.researchOpinion'),
            value: (row) => row.research_opinion ?? '',
          },
          {
            header: t('projects.boardOpinion'),
            value: (row) => row.board_opinion ?? '',
          },
          {
            header: t('common.timeline'),
            value: (row) => formatProjectSchedule(row, locale, t, notAvailable),
          },
        ],
        projects,
      )
      toast.success(t('list.exported'))
    } catch {
      toast.error(t('list.exportFailed'))
    }
  }

  const openCreate = () => {
    setEditingProject(null)
    setDialogOpen(true)
  }

  const openEdit = (project: ProjectListItem) => {
    setEditingProject(project)
    setDialogOpen(true)
  }

  const ensureFactoryContext = (): string | null => {
    if (!profile?.factory_id) {
      toast.error(t('projects.notLinkedToFactory'))
      return null
    }

    return profile.factory_id
  }

  const uploadFilesForProject = async (projectId: string, files: File[]) => {
    if (!user?.id || files.length === 0) {
      return
    }

    await uploadProjectAttachments({
      projectId,
      userId: user.id,
      files,
    })
    await queryClient.invalidateQueries({
      queryKey: queryKeys.projectAttachments(projectId),
    })
  }

  const saveProject = async ({ values, files }: ProjectFormSubmitPayload) => {
    const factoryId = ensureFactoryContext()
    const userId = user?.id

    if (!factoryId || !userId) {
      return
    }

    try {
      if (editingProject) {
        await updateProject.mutateAsync({ id: editingProject.id, values })
        await uploadFilesForProject(editingProject.id, files)
        toast.success(
          canSubmitProject(editingProject.status)
            ? t('projects.draftUpdated')
            : t('projects.updated'),
        )
      } else {
        const created = await createProject.mutateAsync({
          factoryId,
          userId,
          values,
          status: 'draft',
        })
        await uploadFilesForProject(created.id, files)
        toast.success(t('projects.draftCreated'))
      }
    } catch (submitError) {
      toastMutationError(
        submitError,
        editingProject && !canSubmitProject(editingProject.status)
          ? t('projects.updateFailed')
          : t('projects.saveDraftFailed'),
        t,
      )
      throw submitError
    }
  }

  const submitProposal = async ({
    values,
    files,
  }: ProjectFormSubmitPayload) => {
    const factoryId = ensureFactoryContext()
    const userId = user?.id

    if (!factoryId || !userId) {
      return
    }

    try {
      if (editingProject) {
        await updateProject.mutateAsync({ id: editingProject.id, values })
        await uploadFilesForProject(editingProject.id, files)
        await submitProject.mutateAsync({ id: editingProject.id, userId })
        toast.success(t('projects.proposalSubmitted'))
      } else {
        const created = await createProject.mutateAsync({
          factoryId,
          userId,
          values,
          status: 'consultation',
        })
        await uploadFilesForProject(created.id, files)
        toast.success(t('projects.proposalSubmitted'))
      }
    } catch (submitError) {
      toastMutationError(submitError, t('projects.submitFailed'), t)
      throw submitError
    }
  }

  const handleQuickSubmit = async (project: ProjectListItem) => {
    const userId = user?.id

    if (!userId) {
      return
    }

    try {
      await submitProject.mutateAsync({ id: project.id, userId })
      toast.success(t('projects.proposalSubmitted'))
    } catch (submitError) {
      toastMutationError(submitError, t('projects.submitFailed'), t)
    }
  }

  const handleApprove = async (project: ProjectListItem) => {
    const userId = user?.id

    if (!userId) {
      return
    }

    try {
      await approveProject.mutateAsync({ id: project.id, userId })
      toast.success(t('projects.proposalApproved'))
    } catch (submitError) {
      toastMutationError(submitError, t('projects.approveFailed'), t)
    }
  }

  const openReject = (project: ProjectListItem) => {
    setRejectingProject(project)
    setRejectDialogOpen(true)
  }

  const openConsultation = (project: ProjectListItem) => {
    setConsultingProject(project)
    setConsultationDialogOpen(true)
  }

  const handleSaveConsultation = async (
    values: ConsultationOpinionsFormValues,
  ) => {
    if (!consultingProject) {
      return
    }

    try {
      await updateConsultationOpinions.mutateAsync({
        id: consultingProject.id,
        researchOpinion: values.research_opinion,
        boardOpinion: values.board_opinion,
      })
      toast.success(t('projects.consultationSaved'))
    } catch (submitError) {
      toastMutationError(submitError, t('projects.consultationSaveFailed'), t)
      throw submitError
    }
  }

  const handleCompleteConsultation = async (
    values: ConsultationOpinionsFormValues,
  ) => {
    if (!consultingProject) {
      return
    }

    try {
      await updateConsultationOpinions.mutateAsync({
        id: consultingProject.id,
        researchOpinion: values.research_opinion,
        boardOpinion: values.board_opinion,
      })
      await completeConsultation.mutateAsync({ id: consultingProject.id })
      toast.success(t('projects.consultationCompleted'))
    } catch (submitError) {
      toastMutationError(
        submitError,
        t('projects.consultationCompleteFailed'),
        t,
      )
      throw submitError
    }
  }

  const handleReject = async (values: ProjectRejectValues) => {
    if (!rejectingProject) {
      return
    }

    try {
      await rejectProject.mutateAsync({
        id: rejectingProject.id,
        rejectionReason: values.rejection_reason,
      })
      toast.success(t('projects.proposalRejected'))
    } catch (submitError) {
      toastMutationError(submitError, t('projects.rejectFailed'), t)
      throw submitError
    }
  }

  const handleStartExecution = async () => {
    if (!startingProject) {
      return
    }

    try {
      await startProjectExecution.mutateAsync({ id: startingProject.id })
      toast.success(t('projects.executionStarted'))
    } catch (submitError) {
      toastMutationError(submitError, t('projects.startExecutionFailed'), t)
      throw submitError
    }
  }

  const openPauseExecution = (project: ProjectListItem) => {
    setPausingProject(project)
    setPauseDialogOpen(true)
  }

  const handlePauseExecution = async (values: ProjectPauseValues) => {
    if (!pausingProject) {
      return
    }

    try {
      await pauseProjectExecution.mutateAsync({
        id: pausingProject.id,
        reason: values.pause_reason,
      })
      toast.success(t('projects.executionPaused'))
    } catch (submitError) {
      toastMutationError(submitError, t('projects.pauseExecutionFailed'), t)
      throw submitError
    }
  }

  const handleResumeExecution = async (project: ProjectListItem) => {
    try {
      await resumeProjectExecution.mutateAsync({ id: project.id })
      toast.success(t('projects.executionResumed'))
    } catch (submitError) {
      toastMutationError(submitError, t('projects.resumeExecutionFailed'), t)
    }
  }

  const handleCompleteExecution = async (project: ProjectListItem) => {
    try {
      if (canConfirmCompletion(profile)) {
        await completeProjectExecution.mutateAsync({ id: project.id })
        toast.success(t('projects.executionCompleted'))
      } else {
        await requestCompletion.mutateAsync({ id: project.id })
        toast.success(t('projects.completionRequested'))
      }
    } catch (submitError) {
      toastMutationError(
        submitError,
        canConfirmCompletion(profile)
          ? t('projects.completeExecutionFailed')
          : t('projects.completionRequestFailed'),
        t,
      )
    }
  }

  const isSaving =
    createProject.isPending ||
    updateProject.isPending ||
    submitProject.isPending

  const isReviewing = approveProject.isPending || rejectProject.isPending
  const isConsulting =
    updateConsultationOpinions.isPending || completeConsultation.isPending
  const isChangingExecutionState =
    startProjectExecution.isPending ||
    pauseProjectExecution.isPending ||
    resumeProjectExecution.isPending ||
    completeProjectExecution.isPending ||
    requestCompletion.isPending

  const projectDetailLabel = (status: ProjectStatus) => {
    if (canReviewProject(status)) {
      return t('projects.reviewProposal')
    }

    if (status === 'consultation') {
      return t('projects.openConsultation')
    }

    if (isProposalReviewStatus(status)) {
      return t('projects.openProposal')
    }

    return t('common.wbs')
  }

  const getExecutionPermissionHint = (project: ProjectListItem): string => {
    if (!profile) {
      return t('projects.executionHintNoAccess')
    }

    if (!hasControl) {
      return t('projects.executionHintViewOnly')
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

  const renderProjectActions = (project: ProjectListItem) => {
    const canReviewAsDirector = canApproveAsDirector(project, profile)
    const canConsultAsDirector = canCompleteConsultation(project, profile)
    const canGovern = canGovernExecution(project, profile)
    const canStart = canStartExecution(project, profile)
    const canRequestClose = canRequestCompletion(project, profile)
    const canConfirmClose = canConfirmCompletion(profile)
    const executionEligibleStatus =
      project.status === 'approved' ||
      project.status === 'in_progress' ||
      project.status === 'paused'

    return (
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link to={buildProjectPath(project)}>
            {canViewWbs(project.status) ? (
              <Layers className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
            {projectDetailLabel(project.status)}
          </Link>
        </Button>
        {canConsultAsDirector ? (
          <Button
            size="sm"
            onClick={() => openConsultation(project)}
            disabled={isConsulting}
          >
            {t('projects.openConsultation')}
          </Button>
        ) : null}
        {canReviewAsDirector ? (
          <>
            <Button
              size="sm"
              onClick={() => void handleApprove(project)}
              disabled={isReviewing}
            >
              <Check className="size-4" />
              {t('common.approve')}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => openReject(project)}
              disabled={isReviewing}
            >
              <X className="size-4" />
              {t('common.reject')}
            </Button>
          </>
        ) : null}
        {canManageProposals && canEditProjectDetails(project.status) ? (
          <Button size="sm" variant="outline" onClick={() => openEdit(project)}>
            {t('common.edit')}
          </Button>
        ) : null}
        {canManageProposals && canSubmitProject(project.status) ? (
          <Button
            size="sm"
            onClick={() => void handleQuickSubmit(project)}
            disabled={submitProject.isPending}
          >
            <Send className="size-4" />
            {t('common.submit')}
          </Button>
        ) : null}
        {canStart && project.status === 'approved' ? (
          <Button
            size="sm"
            onClick={() => setStartingProject(project)}
            disabled={isChangingExecutionState}
          >
            {t('common.startExecution')}
          </Button>
        ) : null}
        {canGovern && project.status === 'in_progress' ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => openPauseExecution(project)}
            disabled={isChangingExecutionState}
          >
            {t('common.pauseExecution')}
          </Button>
        ) : null}
        {(canConfirmClose || canRequestClose) &&
        (project.status === 'in_progress' || project.status === 'paused') ? (
          <Button
            size="sm"
            onClick={() => void handleCompleteExecution(project)}
            disabled={
              isChangingExecutionState ||
              Boolean(!canConfirmClose && project.completion_requested_at)
            }
          >
            {canConfirmClose
              ? t('common.completeExecution')
              : t('projects.completeDialog.requestAction')}
          </Button>
        ) : null}
        {canGovern && project.status === 'paused' ? (
          <Button
            size="sm"
            onClick={() => void handleResumeExecution(project)}
            disabled={isChangingExecutionState}
          >
            {t('common.resumeExecution')}
          </Button>
        ) : null}
        {!canGovern && !canStart && executionEligibleStatus ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" disabled>
                  <Lock className="size-4" />
                  {t('projects.executionActionsLocked')}
                </Button>
              </TooltipTrigger>
              <TooltipContent sideOffset={6}>
                {getExecutionPermissionHint(project)}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </div>
    )
  }

  return (
    <PaginatedListPage
      header={
        <PageHeader
          title={t('projects.title')}
          description={
            canManageProposals
              ? t('projects.managerDescription')
              : isDirector && hasControl
                ? t('projects.directorDescription')
                : t('projects.viewerDescription')
          }
          actions={
            <PageHeaderActions
              primary={
                canManageProposals
                  ? {
                      id: 'new-proposal',
                      label: (
                        <>
                          <Plus className="size-4" />
                          {t('common.newProposal')}
                        </>
                      ),
                      onClick: openCreate,
                    }
                  : null
              }
              secondary={[
                {
                  id: 'export-projects',
                  label: (
                    <>
                      <Download className="size-4" />
                      {t('list.exportExcel')}
                    </>
                  ),
                  onClick: handleExport,
                },
                {
                  id: 'import-projects',
                  label: (
                    <>
                      <Upload className="size-4" />
                      {t('common.import')}
                    </>
                  ),
                  hidden: !canImportProjects,
                  onClick: () => setImportOpen(true),
                },
              ]}
            />
          }
        />
      }
      toolbar={
        <ListToolbar
          search={listState.search}
          onSearchChange={listState.setSearch}
          searchPlaceholder={t('list.searchProjects')}
          hasActiveFilters={listState.hasActiveFilters}
          onClear={listState.clearAll}
          filters={[
            {
              id: 'project-status-filter',
              label: t('common.status'),
              value: listState.filters.status,
              onChange: (value) => listState.setFilter('status', value),
              options: [
                { value: 'all', label: t('list.allStatuses') },
                ...PROJECT_STATUS_FILTERS.map((status) => ({
                  value: status,
                  label: getProjectStatusLabel(t, status),
                })),
              ],
            },
            ...(isDirector
              ? [
                  {
                    id: 'project-factory-filter',
                    label: t('common.factory'),
                    value: listState.filters.factoryId,
                    onChange: (value: string) =>
                      listState.setFilter('factoryId', value),
                    options: buildFactoryFilterOptions(
                      factories,
                      t('list.allFactories'),
                    ),
                  },
                ]
              : []),
          ]}
        />
      }
      items={projects}
      total={total}
      page={listState.page}
      pageSize={listState.pageSize}
      onPageChange={listState.setPage}
      onPageSizeChange={listState.setPageSize}
      emptyMessage={
        listState.hasActiveFilters
          ? t('list.noResults')
          : canManageProposals
            ? t('projects.emptyManager')
            : t('projects.emptyDefault')
      }
      getKey={(project) => project.id}
      renderMobileCard={(project) => (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium">
              <Link className="hover:underline" to={buildProjectPath(project)}>
                {project.title}
              </Link>
            </p>
            <ProjectStatusBadge status={project.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {t('projects.priority')}:{' '}
            </span>
            {getProjectPriorityLabel(t, project.priority, notAvailable)}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {t('common.budget')}:{' '}
            </span>
            {formatLocalizedBudget(
              project.budget,
              project.currency,
              locale,
              notAvailable,
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {t('projects.budgetUsed')}:{' '}
            </span>
            {formatBudgetUsed(project)}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {t('projects.fundingStatus')}:{' '}
            </span>
            {formatFundingStatus(project)}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {t('common.timeline')}:{' '}
            </span>
            {formatProjectSchedule(project, locale, t, notAvailable)}
          </p>
          {renderProjectActions(project)}
        </div>
      )}
      query={{
        isLoading,
        error,
        loadingMessage: t('projects.loading'),
        errorMessage: t('projects.loadFailed'),
        onRetry: () => void refetch(),
        isRetrying: isFetching,
      }}
      footer={
        <>
          {canImportProjects ? (
            <ProjectImportDialog
              open={importOpen}
              onOpenChange={setImportOpen}
            />
          ) : null}
          {canManageProposals ? (
            <ProjectFormDialog
              open={isCreateDialogOpen}
              onOpenChange={handleCreateDialogOpenChange}
              project={editingProject}
              factoryId={profile?.factory_id}
              allowSubmitProposal={
                !editingProject || canSubmitProject(editingProject.status)
              }
              onSaveDraft={saveProject}
              onSubmitProposal={submitProposal}
              isSubmitting={isSaving}
            />
          ) : null}

          <ProjectRejectDialog
            open={rejectDialogOpen}
            onOpenChange={setRejectDialogOpen}
            projectTitle={rejectingProject?.title ?? null}
            onSubmit={handleReject}
            isSubmitting={rejectProject.isPending}
          />
          {consultingProject ? (
            <ProjectConsultationDialog
              open={consultationDialogOpen}
              onOpenChange={(open) => {
                setConsultationDialogOpen(open)
                if (!open) {
                  setConsultingProject(null)
                }
              }}
              project={consultingProject}
              onSave={handleSaveConsultation}
              onComplete={handleCompleteConsultation}
              isSaving={updateConsultationOpinions.isPending}
              isCompleting={
                updateConsultationOpinions.isPending ||
                completeConsultation.isPending
              }
            />
          ) : null}
          {startingProject ? (
            <ProjectStartExecutionDialog
              open
              onOpenChange={(open) => {
                if (!open) {
                  setStartingProject(null)
                }
              }}
              project={startingProject}
              fundingReceived={Number(startingProject.funding_received ?? 0)}
              taskCount={startingTasks.length}
              readinessReasons={startingReadiness?.reasons ?? []}
              onConfirm={handleStartExecution}
              isSubmitting={startProjectExecution.isPending}
            />
          ) : null}
          <ProjectPauseDialog
            open={pauseDialogOpen}
            onOpenChange={setPauseDialogOpen}
            projectTitle={pausingProject?.title ?? null}
            onSubmit={handlePauseExecution}
            isSubmitting={pauseProjectExecution.isPending}
          />
        </>
      }
    >
      <TooltipProvider delayDuration={200}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('common.title')}</TableHead>
              {isDirector ? <TableHead>{t('common.factory')}</TableHead> : null}
              <TableHead>{t('common.status')}</TableHead>
              <TableHead>{t('projects.priority')}</TableHead>
              <TableHead>{t('common.budget')}</TableHead>
              <TableHead>{t('projects.budgetUsed')}</TableHead>
              <TableHead>{t('projects.fundingStatus')}</TableHead>
              <TableHead>{t('common.timeline')}</TableHead>
              {isDirector ? (
                <TableHead>{t('projects.proposedBy')}</TableHead>
              ) : null}
              <TableHead className="text-end">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="max-w-56 min-w-40 whitespace-normal">
                  <div className="space-y-1">
                    <p className="font-medium">
                      {project.description ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              className="hover:underline"
                              to={buildProjectPath(project)}
                            >
                              {project.title}
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent
                            sideOffset={6}
                            className="max-w-xs text-start"
                          >
                            {project.description.length > 120
                              ? `${project.description.slice(0, 120)}…`
                              : project.description}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Link
                          className="hover:underline"
                          to={buildProjectPath(project)}
                        >
                          {project.title}
                        </Link>
                      )}
                    </p>
                    {project.status === 'rejected' &&
                    project.rejection_reason ? (
                      <p className="line-clamp-2 text-sm text-destructive">
                        {t('projects.rejectedPrefix')}{' '}
                        {project.rejection_reason}
                      </p>
                    ) : null}
                  </div>
                </TableCell>
                {isDirector ? (
                  <TableCell>
                    {project.factories
                      ? formatFactoryLabel(project.factories)
                      : notAvailable}
                  </TableCell>
                ) : null}
                <TableCell>
                  <ProjectStatusBadge status={project.status} />
                </TableCell>
                <TableCell>
                  {getProjectPriorityLabel(t, project.priority, notAvailable)}
                </TableCell>
                <TableCell>
                  {formatLocalizedBudget(
                    project.budget,
                    project.currency,
                    locale,
                    notAvailable,
                  )}
                </TableCell>
                <TableCell>{formatBudgetUsed(project)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{formatFundingStatus(project)}</Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {formatProjectSchedule(project, locale, t, notAvailable)}
                </TableCell>
                {isDirector ? (
                  <TableCell>
                    {project.proposer?.full_name ?? notAvailable}
                  </TableCell>
                ) : null}
                <TableCell className="text-end">
                  {renderProjectActions(project)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TooltipProvider>
    </PaginatedListPage>
  )
}
