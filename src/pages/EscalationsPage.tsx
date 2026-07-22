import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { FormFieldError } from '@/components/FormFieldError'
import { AdaptiveList } from '@/components/AdaptiveList'
import { ListPagination } from '@/components/ListPagination'
import { ListToolbar } from '@/components/ListToolbar'
import { PageHeader } from '@/components/PageHeader'
import { QueryState } from '@/components/QueryState'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
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
import { useCreateComment } from '@/hooks/useComments'
import { useEscalationsPage } from '@/hooks/useEscalations'
import { useFactories } from '@/hooks/useFactories'
import { useListQueryState } from '@/hooks/useListQueryState'
import { formatFactoryLabel, formatLocalizedDateTime } from '@/lib/i18n-format'
import { buildFactoryFilterOptions } from '@/lib/list-filters'
import { toastMutationError } from '@/lib/mutation-error'
import { isCompanyDirector } from '@/lib/roles'
import { useValidationSchema } from '@/hooks/useValidationSchema'
import {
  createEscalationFormSchema,
  formatEscalationBody,
  type EscalationFormValues,
} from '@/lib/validations/comment'
import type { EscalationItem } from '@/hooks/useEscalations'

export function EscalationsPage() {
  const { t, locale } = useTranslation()
  const { user, profile } = useAuth()
  const isDirector = isCompanyDirector(profile?.role)
  const listState = useListQueryState({ factoryId: 'all' })
  const { data: factories = [] } = useFactories()
  const { data, isLoading, error, refetch, isFetching } = useEscalationsPage({
    page: listState.page,
    pageSize: listState.pageSize,
    search: listState.debouncedSearch,
    factoryId: listState.filters.factoryId,
  })
  const escalations = data?.items ?? []
  const total = data?.total ?? 0
  const [selectedTask, setSelectedTask] = useState<EscalationItem | null>(null)
  const createComment = useCreateComment('task', selectedTask?.id)
  const notAvailable = t('common.notAvailable')
  const escalationFormSchema = useValidationSchema(createEscalationFormSchema)

  const form = useForm<EscalationFormValues>({
    resolver: zodResolver(escalationFormSchema),
    defaultValues: { message: '' },
  })

  const openEscalate = (task: EscalationItem) => {
    setSelectedTask(task)
    form.reset({ message: task.blocked_reason ?? '' })
  }

  const submitEscalation = form.handleSubmit(async (values) => {
    if (!user?.id || !selectedTask) {
      return
    }

    try {
      await createComment.mutateAsync({
        values: { body: formatEscalationBody(values.message) },
        authorId: user.id,
      })
      toast.success(t('escalations.sent'))
      setSelectedTask(null)
    } catch (submitError) {
      toastMutationError(submitError, t('escalations.sendFailed'))
    }
  })

  return (
    <section className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <AlertTriangle className="size-8 text-destructive" />
            {t('escalations.title')}
          </span>
        }
        description={t('escalations.description')}
      />

      <ListToolbar
        search={listState.search}
        onSearchChange={listState.setSearch}
        searchPlaceholder={t('list.searchEscalations')}
        hasActiveFilters={listState.hasActiveFilters}
        onClear={listState.clearAll}
        filters={
          isDirector
            ? [
                {
                  id: 'escalation-factory-filter',
                  label: t('common.factory'),
                  value: listState.filters.factoryId,
                  onChange: (value) => listState.setFilter('factoryId', value),
                  options: buildFactoryFilterOptions(
                    factories,
                    t('list.allFactories'),
                  ),
                },
              ]
            : undefined
        }
      />

      <QueryState
        isLoading={isLoading}
        error={error}
        loadingMessage={t('escalations.loading')}
        errorMessage={t('escalations.loadFailed')}
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      >
        <AdaptiveList
          items={escalations}
          emptyMessage={
            listState.hasActiveFilters
              ? t('list.noResults')
              : t('escalations.empty')
          }
          getKey={(task) => task.id}
          renderMobileCard={(task) => (
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="font-medium">{task.title}</p>
                <p className="text-sm text-muted-foreground">
                  {task.phases?.name ?? t('common.phase')}
                </p>
              </div>
              <p className="text-sm">
                <span className="font-medium text-muted-foreground">
                  {t('escalations.project')}:{' '}
                </span>
                {task.projects ? (
                  <Link
                    className="font-medium hover:underline"
                    to={`/projects/${task.projects.id}`}
                  >
                    {task.projects.title}
                  </Link>
                ) : (
                  notAvailable
                )}
              </p>
              <p className="text-sm text-destructive">
                <span className="font-medium">
                  {t('escalations.blockedReason')}:{' '}
                </span>
                {task.blocked_reason ?? notAvailable}
              </p>
              <Button size="sm" onClick={() => openEscalate(task)}>
                {t('common.escalate')}
              </Button>
            </div>
          )}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('escalations.task')}</TableHead>
                <TableHead>{t('escalations.project')}</TableHead>
                <TableHead>{t('common.factory')}</TableHead>
                <TableHead>{t('escalations.blockedReason')}</TableHead>
                <TableHead>{t('common.updated')}</TableHead>
                <TableHead className="text-right">
                  {t('common.actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {escalations.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {task.phases?.name ?? t('common.phase')}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {task.projects ? (
                      <Link
                        className="font-medium hover:underline"
                        to={`/projects/${task.projects.id}`}
                      >
                        {task.projects.title}
                      </Link>
                    ) : (
                      notAvailable
                    )}
                  </TableCell>
                  <TableCell>
                    {task.projects?.factories
                      ? formatFactoryLabel(task.projects.factories)
                      : notAvailable}
                  </TableCell>
                  <TableCell className="max-w-xs text-sm text-destructive">
                    {task.blocked_reason ?? notAvailable}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatLocalizedDateTime(task.updated_at, locale)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={() => openEscalate(task)}>
                      {t('common.escalate')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdaptiveList>

        <ListPagination
          page={listState.page}
          pageSize={listState.pageSize}
          total={total}
          onPageChange={listState.setPage}
          onPageSizeChange={listState.setPageSize}
        />
      </QueryState>

      <Dialog
        open={Boolean(selectedTask)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTask(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('escalations.escalateTitle')}</DialogTitle>
            <DialogDescription>
              {selectedTask
                ? t('escalations.escalateDescription', {
                    title: selectedTask.title,
                  })
                : null}
            </DialogDescription>
          </DialogHeader>
          <form key={locale} className="space-y-4" onSubmit={submitEscalation}>
            <Textarea rows={4} {...form.register('message')} />
            <FormFieldError error={form.formState.errors.message} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedTask(null)}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createComment.isPending}>
                {createComment.isPending
                  ? t('common.sending')
                  : t('common.sendEscalation')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}
