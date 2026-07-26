import { Link } from 'react-router-dom'
import { useState } from 'react'
import { toast } from 'sonner'
import { EscalationFormDialog } from '@/components/escalations/EscalationFormDialog'
import { ListToolbar } from '@/components/ListToolbar'
import { PageHeader } from '@/components/PageHeader'
import { PaginatedListPage } from '@/components/PaginatedListPage'
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
import { useCreateComment } from '@/hooks/useComments'
import { useEscalationsPage, type EscalationItem } from '@/hooks/useEscalations'
import { useFactories } from '@/hooks/useFactories'
import { useListQueryState } from '@/hooks/useListQueryState'
import { formatFactoryLabel, formatLocalizedDateTime } from '@/lib/i18n-format'
import { buildFactoryFilterOptions } from '@/lib/list-filters'
import { toastMutationError } from '@/lib/mutation-error'
import { isCompanyDirector } from '@/lib/roles'
import {
  formatEscalationBody,
  type EscalationFormValues,
} from '@/lib/validations/comment'

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

  const handleEscalationSubmit = async (values: EscalationFormValues) => {
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
      throw submitError
    }
  }

  return (
    <PaginatedListPage
      header={
        <PageHeader
          title={t('escalations.title')}
          description={t('escalations.description')}
        />
      }
      toolbar={
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
                    onChange: (value) =>
                      listState.setFilter('factoryId', value),
                    options: buildFactoryFilterOptions(
                      factories,
                      t('list.allFactories'),
                    ),
                  },
                ]
              : undefined
          }
        />
      }
      items={escalations}
      total={total}
      page={listState.page}
      pageSize={listState.pageSize}
      onPageChange={listState.setPage}
      onPageSizeChange={listState.setPageSize}
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
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedTask(task)}
          >
            {t('common.escalate')}
          </Button>
        </div>
      )}
      query={{
        isLoading,
        error,
        loadingMessage: t('escalations.loading'),
        errorMessage: t('escalations.loadFailed'),
        onRetry: () => void refetch(),
        isRetrying: isFetching,
      }}
      footer={
        <EscalationFormDialog
          open={Boolean(selectedTask)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedTask(null)
            }
          }}
          taskTitle={selectedTask?.title ?? null}
          initialMessage={selectedTask?.blocked_reason ?? ''}
          onSubmit={handleEscalationSubmit}
          isSubmitting={createComment.isPending}
        />
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('escalations.task')}</TableHead>
            <TableHead>{t('escalations.project')}</TableHead>
            <TableHead>{t('common.factory')}</TableHead>
            <TableHead>{t('escalations.blockedReason')}</TableHead>
            <TableHead>{t('common.updated')}</TableHead>
            <TableHead className="text-end">{t('common.actions')}</TableHead>
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
              <TableCell className="text-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedTask(task)}
                >
                  {t('common.escalate')}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PaginatedListPage>
  )
}
