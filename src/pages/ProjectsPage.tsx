import { format } from 'date-fns'
import { Check, Layers, Plus, Send, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog'
import { ProjectRejectDialog } from '@/components/projects/ProjectRejectDialog'
import { ProjectStatusBadge } from '@/components/projects/ProjectStatusBadge'
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
import {
  useApproveProject,
  useCreateProject,
  useProjects,
  useRejectProject,
  useSubmitProject,
  useUpdateProject,
  type ProjectListItem,
} from '@/hooks/useProjects'
import {
  canEditProject,
  canReviewProject,
  canSubmitProject,
} from '@/lib/project-status'
import type { ProjectRejectValues } from '@/lib/validations/approval'
import { canViewWbs } from '@/lib/wbs'
import { isCompanyDirector, isFactoryManager } from '@/lib/roles'
import type { ProjectFormValues } from '@/lib/validations/project'
import type { Project } from '@/types/database'

function formatDate(value: string | null): string {
  if (!value) {
    return '—'
  }

  return format(new Date(`${value}T00:00:00`), 'dd MMM yyyy')
}

function formatBudget(budget: number | null, currency: string): string {
  if (budget === null) {
    return '—'
  }

  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(budget)
}

export function ProjectsPage() {
  const { profile, user } = useAuth()
  const { data: projects = [], isLoading, error } = useProjects()
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
      toast.error('Your account is not linked to a factory')
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
        toast.success('Draft updated')
      } else {
        await createProject.mutateAsync({
          factoryId,
          userId,
          values,
          status: 'draft',
        })
        toast.success('Draft created')
      }
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Unable to save draft'
      toast.error(message)
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
        toast.success('Proposal submitted for approval')
      } else {
        await createProject.mutateAsync({
          factoryId,
          userId,
          values,
          status: 'proposed',
        })
        toast.success('Proposal submitted for approval')
      }
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Unable to submit proposal'
      toast.error(message)
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
      toast.success('Proposal submitted for approval')
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Unable to submit proposal'
      toast.error(message)
    }
  }

  const handleApprove = async (project: ProjectListItem) => {
    const userId = user?.id

    if (!userId) {
      return
    }

    try {
      await approveProject.mutateAsync({ id: project.id, userId })
      toast.success('Proposal approved')
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Unable to approve proposal'
      toast.error(message)
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
      toast.success('Proposal rejected')
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Unable to reject proposal'
      toast.error(message)
      throw submitError
    }
  }

  const isSaving =
    createProject.isPending ||
    updateProject.isPending ||
    submitProject.isPending

  const isReviewing = approveProject.isPending || rejectProject.isPending

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
          <p className="max-w-2xl text-slate-600">
            {canManageProposals
              ? 'Create project proposals and submit them for company director approval.'
              : isDirector
                ? 'Review submitted proposals and approve or reject them with feedback.'
                : 'View projects assigned to you.'}
          </p>
        </div>
        {canManageProposals ? (
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            New proposal
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading projects…</p>
      ) : null}

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Failed to load projects'}
        </p>
      ) : null}

      {!isLoading && !error ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                {isDirector ? <TableHead>Factory</TableHead> : null}
                <TableHead>Status</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Timeline</TableHead>
                {isDirector ? <TableHead>Proposed by</TableHead> : null}
                <TableHead>PM</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isDirector ? 8 : 6}
                    className="py-10 text-center text-slate-500"
                  >
                    {canManageProposals
                      ? 'No proposals yet. Create your first project proposal.'
                      : 'No projects to show.'}
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((project) => (
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
                          <p className="line-clamp-1 text-sm text-slate-500">
                            {project.description}
                          </p>
                        ) : null}
                        {project.status === 'rejected' &&
                        project.rejection_reason ? (
                          <p className="text-sm text-red-600">
                            Rejected: {project.rejection_reason}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    {isDirector ? (
                      <TableCell>
                        {project.factories
                          ? `${project.factories.name} (${project.factories.code})`
                          : '—'}
                      </TableCell>
                    ) : null}
                    <TableCell>
                      <ProjectStatusBadge status={project.status} />
                    </TableCell>
                    <TableCell>
                      {formatBudget(project.budget, project.currency)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-slate-600">
                      {formatDate(project.proposed_start_date)} →{' '}
                      {formatDate(project.proposed_end_date)}
                    </TableCell>
                    {isDirector ? (
                      <TableCell>
                        {project.proposer?.full_name ?? '—'}
                      </TableCell>
                    ) : null}
                    <TableCell>
                      {project.assigned_pm?.full_name ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {canViewWbs(project.status) ? (
                          <Button asChild size="sm" variant="outline">
                            <Link to={`/projects/${project.id}`}>
                              <Layers className="size-4" />
                              WBS
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
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openReject(project)}
                              disabled={isReviewing}
                            >
                              <X className="size-4" />
                              Reject
                            </Button>
                          </>
                        ) : null}
                        {canManageProposals &&
                        canEditProject(project.status) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(project)}
                          >
                            Edit
                          </Button>
                        ) : null}
                        {canManageProposals &&
                        canSubmitProject(project.status) ? (
                          <Button
                            size="sm"
                            onClick={() => void handleQuickSubmit(project)}
                            disabled={submitProject.isPending}
                          >
                            <Send className="size-4" />
                            Submit
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : null}

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
    </section>
  )
}
