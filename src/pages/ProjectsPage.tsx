import { Check, Layers, Plus, Send, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { PaginatedListPage } from '@/components/PaginatedListPage'
import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog'
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
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/contexts/LocaleContext'
import {
  useApproveProject,
  useCreateProject,
  useProjectsPage,
  useRejectProject,
  useSubmitProject,
  useUpdateProject,
  type ProjectListItem,
} from '@/hooks/useProjects'
import { useFactories } from '@/hooks/useFactories'
import { useListQueryState } from '@/hooks/useListQueryState'
import type { ProjectsPageParams } from '@/lib/list-query-params'
import {
  formatLocalizedBudget,
  formatLocalizedDate,
  formatFactoryLabel,
  getProjectStatusLabel,
} from '@/lib/i18n-format'
import { buildFactoryFilterOptions } from '@/lib/list-filters'
import { toastMutationError } from '@/lib/mutation-error'
import {
  canEditProject,
  canReviewProject,
  canSubmitProject,
} from '@/lib/project-status'
import type { ProjectRejectValues } from '@/lib/validations/approval'
import { canViewWbs } from '@/lib/wbs'
import { isCompanyDirector, isFactoryManager } from '@/lib/roles'
import type { ProjectFormValues } from '@/lib/validations/project'
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
  const [dialogOpen, setDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [rejectingProject, setRejectingProject] =
    useState<ProjectListItem | null>(null)

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

  const saveDraft = async (values: ProjectFormValues) => {
    const factoryId = ensureFactoryContext()
    const userId = user?.id

    if (!factoryId || !userId) {
      return
    }

    try {
      if (editingProject) {
        await updateProject.mutateAsync({ id: editingProject.id, values })
        toast.success(t('projects.draftUpdated'))
      } else {
        await createProject.mutateAsync({
          factoryId,
          userId,
          values,
          status: 'draft',
        })
        toast.success(t('projects.draftCreated'))
      }
    } catch (submitError) {
      toastMutationError(submitError, t('projects.saveDraftFailed'))
      throw submitError
    }
  }

  const submitProposal = async (values: ProjectFormValues) => {
    const factoryId = ensureFactoryContext()
    const userId = user?.id

    if (!factoryId || !userId) {
      return
    }

    try {
      if (editingProject) {
        await updateProject.mutateAsync({ id: editingProject.id, values })
        await submitProject.mutateAsync({ id: editingProject.id, userId })
        toast.success(t('projects.proposalSubmitted'))
      } else {
        await createProject.mutateAsync({
          factoryId,
          userId,
          values,
          status: 'proposed',
        })
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

  const isSaving =
    createProject.isPending ||
    updateProject.isPending ||
    submitProject.isPending

  const isReviewing = approveProject.isPending || rejectProject.isPending

  const renderProjectActions = (project: ProjectListItem) => (
    <div className="flex flex-wrap gap-2">
      {canViewWbs(project.status) ? (
        <Button asChild size="sm" variant="outline">
          <Link to={`/projects/${project.id}`}>
            <Layers className="size-4" />
            {t('common.wbs')}
          </Link>
        </Button>
      ) : null}
      {isDirector && canReviewProject(project.status) ? (
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
      {canManageProposals && canEditProject(project.status) ? (
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
    </div>
  )

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
              {canViewWbs(project.status) ? (
                <Link
                  className="hover:underline"
                  to={`/projects/${project.id}`}
                >
                  {project.title}
                </Link>
              ) : (
                project.title
              )}
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
            {formatLocalizedDate(
              project.proposed_start_date,
              locale,
              notAvailable,
            )}{' '}
            →{' '}
            {formatLocalizedDate(
              project.proposed_end_date,
              locale,
              notAvailable,
            )}
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
              onSaveDraft={saveDraft}
              onSubmitProposal={submitProposal}
              isSubmitting={isSaving}
            />
          ) : null}

          {isDirector ? (
            <ProjectRejectDialog
              open={rejectDialogOpen}
              onOpenChange={setRejectDialogOpen}
              projectTitle={rejectingProject?.title ?? null}
              onSubmit={handleReject}
              isSubmitting={rejectProject.isPending}
            />
          ) : null}
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
                    {canViewWbs(project.status) ? (
                      <Link
                        className="hover:underline"
                        to={`/projects/${project.id}`}
                      >
                        {project.title}
                      </Link>
                    ) : (
                      project.title
                    )}
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
                {formatLocalizedDate(
                  project.proposed_start_date,
                  locale,
                  notAvailable,
                )}{' '}
                →{' '}
                {formatLocalizedDate(
                  project.proposed_end_date,
                  locale,
                  notAvailable,
                )}
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
