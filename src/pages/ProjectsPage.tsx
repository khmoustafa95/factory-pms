import { Check, Eye, Layers, Lock, Plus, Send, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PaginatedListPage } from '@/components/PaginatedListPage'
import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog'
import { ProjectPauseDialog } from '@/components/projects/ProjectPauseDialog'
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
  useCompleteProjectExecution,
  useCreateProject,
  usePauseProjectExecution,
  useProjectsPage,
  useRejectProject,
  useResumeProjectExecution,
  useStartProjectExecution,
  useSubmitProject,
  useUpdateProject,
  type ProjectListItem,
} from '@/hooks/useProjects'
import { useFactories } from '@/hooks/useFactories'
import { useListQueryState } from '@/hooks/useListQueryState'
import type { ProjectsPageParams } from '@/lib/list-query-params'
import { formatProjectSchedule } from '@/lib/project-schedule'
import {
  formatLocalizedBudget,
  formatFactoryLabel,
  getProjectStatusLabel,
} from '@/lib/i18n-format'
import { buildFactoryFilterOptions } from '@/lib/list-filters'
import { toastMutationError } from '@/lib/mutation-error'
import {
  canApproveAsDirector,
  canEditProjectDetails,
  canReviewProject,
  canSubmitProject,
  isProposalReviewStatus,
} from '@/lib/project-status'
import type {
  ProjectPauseValues,
  ProjectRejectValues,
} from '@/lib/validations/approval'
import { canManageWbs, canViewWbs } from '@/lib/wbs'
import {
  isCompanyDirector,
  isFactoryManager,
  isProjectManager,
} from '@/lib/roles'
import type { ProjectFormSubmitPayload } from '@/components/projects/ProjectFormDialog'
import type { Project, ProjectStatus } from '@/types/database'

const PROJECT_STATUS_FILTERS: ProjectStatus[] = [
  'draft',
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
  const startProjectExecution = useStartProjectExecution()
  const pauseProjectExecution = usePauseProjectExecution()
  const resumeProjectExecution = useResumeProjectExecution()
  const completeProjectExecution = useCompleteProjectExecution()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [rejectingProject, setRejectingProject] =
    useState<ProjectListItem | null>(null)
  const [pausingProject, setPausingProject] = useState<ProjectListItem | null>(
    null,
  )

  const isDirector = isCompanyDirector(profile?.role)
  const isManager = isFactoryManager(profile?.role)
  const canManageProposals = isManager && Boolean(profile?.factory_id)
  const notAvailable = t('common.notAvailable')

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

  const ensureAssignedPm = (assignedPmId: string | null): boolean => {
    if (assignedPmId) {
      return true
    }

    toast.error(t('projects.pmRequiredToSubmit'))
    return false
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

    if (!ensureAssignedPm(values.assigned_pm_id)) {
      throw new Error('PM_REQUIRED')
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
          status: 'proposed',
        })
        await uploadFilesForProject(created.id, files)
        toast.success(t('projects.proposalSubmitted'))
      }
    } catch (submitError) {
      toastMutationError(submitError, t('projects.submitFailed'))
      throw submitError
    }
  }

  const handleQuickSubmit = async (project: ProjectListItem) => {
    const userId = user?.id

    if (!userId) {
      return
    }

    if (!ensureAssignedPm(project.assigned_pm_id)) {
      return
    }

    try {
      await submitProject.mutateAsync({ id: project.id, userId })
      toast.success(t('projects.proposalSubmitted'))
    } catch (submitError) {
      toastMutationError(submitError, t('projects.submitFailed'))
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
      toastMutationError(submitError, t('projects.approveFailed'))
    }
  }

  const openReject = (project: ProjectListItem) => {
    setRejectingProject(project)
    setRejectDialogOpen(true)
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
      toastMutationError(submitError, t('projects.rejectFailed'))
      throw submitError
    }
  }

  const handleStartExecution = async (project: ProjectListItem) => {
    try {
      await startProjectExecution.mutateAsync({ id: project.id })
      toast.success(t('projects.executionStarted'))
    } catch (submitError) {
      toastMutationError(submitError, t('projects.startExecutionFailed'))
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
      toastMutationError(submitError, t('projects.pauseExecutionFailed'))
      throw submitError
    }
  }

  const handleResumeExecution = async (project: ProjectListItem) => {
    try {
      await resumeProjectExecution.mutateAsync({ id: project.id })
      toast.success(t('projects.executionResumed'))
    } catch (submitError) {
      toastMutationError(submitError, t('projects.resumeExecutionFailed'))
    }
  }

  const handleCompleteExecution = async (project: ProjectListItem) => {
    try {
      await completeProjectExecution.mutateAsync({ id: project.id })
      toast.success(t('projects.executionCompleted'))
    } catch (submitError) {
      toastMutationError(submitError, t('projects.completeExecutionFailed'))
    }
  }

  const isSaving =
    createProject.isPending ||
    updateProject.isPending ||
    submitProject.isPending

  const isReviewing = approveProject.isPending || rejectProject.isPending
  const isChangingExecutionState =
    startProjectExecution.isPending ||
    pauseProjectExecution.isPending ||
    resumeProjectExecution.isPending ||
    completeProjectExecution.isPending

  const projectDetailLabel = (status: ProjectStatus) => {
    if (canReviewProject(status)) {
      return t('projects.reviewProposal')
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

  const renderProjectActions = (project: ProjectListItem) => {
    const canReviewAsDirector = canApproveAsDirector(project, profile)
    const canManageExecution = canManageWbs(project, profile)
    const executionEligibleStatus =
      project.status === 'approved' ||
      project.status === 'in_progress' ||
      project.status === 'paused'

    return (
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link to={`/projects/${project.id}`}>
            {canViewWbs(project.status) ? (
              <Layers className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
            {projectDetailLabel(project.status)}
          </Link>
        </Button>
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
        {canManageExecution && project.status === 'approved' ? (
          <Button
            size="sm"
            onClick={() => void handleStartExecution(project)}
            disabled={isChangingExecutionState}
          >
            {t('common.startExecution')}
          </Button>
        ) : null}
        {canManageExecution && project.status === 'in_progress' ? (
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => openPauseExecution(project)}
              disabled={isChangingExecutionState}
            >
              {t('common.pauseExecution')}
            </Button>
            <Button
              size="sm"
              onClick={() => void handleCompleteExecution(project)}
              disabled={isChangingExecutionState}
            >
              {t('common.completeExecution')}
            </Button>
          </>
        ) : null}
        {canManageExecution && project.status === 'paused' ? (
          <Button
            size="sm"
            onClick={() => void handleResumeExecution(project)}
            disabled={isChangingExecutionState}
          >
            {t('common.resumeExecution')}
          </Button>
        ) : null}
        {!canManageExecution && executionEligibleStatus ? (
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
              : isDirector
                ? t('projects.directorDescription')
                : t('projects.pmDescription')
          }
          actions={
            canManageProposals ? (
              <Button onClick={openCreate}>
                <Plus className="size-4" />
                {t('common.newProposal')}
              </Button>
            ) : undefined
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
              <Link className="hover:underline" to={`/projects/${project.id}`}>
                {project.title}
              </Link>
            </p>
            <ProjectStatusBadge status={project.status} />
          </div>
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
          {canManageProposals ? (
            <ProjectFormDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('common.title')}</TableHead>
            {isDirector ? <TableHead>{t('common.factory')}</TableHead> : null}
            <TableHead>{t('common.status')}</TableHead>
            <TableHead>{t('common.budget')}</TableHead>
            <TableHead>{t('common.timeline')}</TableHead>
            {isDirector ? (
              <TableHead>{t('projects.proposedBy')}</TableHead>
            ) : null}
            <TableHead>{t('projects.pm')}</TableHead>
            <TableHead className="text-end">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id}>
              <TableCell>
                <div className="space-y-1">
                  <p className="font-medium">
                    <Link
                      className="hover:underline"
                      to={`/projects/${project.id}`}
                    >
                      {project.title}
                    </Link>
                  </p>
                  {project.description ? (
                    <p className="line-clamp-1 text-sm text-muted-foreground">
                      {project.description}
                    </p>
                  ) : null}
                  {project.status === 'rejected' && project.rejection_reason ? (
                    <p className="text-sm text-destructive">
                      {t('projects.rejectedPrefix')} {project.rejection_reason}
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
                {formatLocalizedBudget(
                  project.budget,
                  project.currency,
                  locale,
                  notAvailable,
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {formatProjectSchedule(project, locale, t, notAvailable)}
              </TableCell>
              {isDirector ? (
                <TableCell>
                  {project.proposer?.full_name ?? notAvailable}
                </TableCell>
              ) : null}
              <TableCell>
                {project.assigned_pm?.full_name ?? notAvailable}
              </TableCell>
              <TableCell className="text-end">
                {renderProjectActions(project)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PaginatedListPage>
  )
}
