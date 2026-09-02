import { Link } from 'react-router-dom'
import { useState } from 'react'
import { toast } from 'sonner'
import { EscalationFormDialog } from '@/components/escalations/EscalationFormDialog'
import { ListToolbar } from '@/components/ListToolbar'
import { PageHeader } from '@/components/PageHeader'
import { PaginatedListPage } from '@/components/PaginatedListPage'
import { Badge } from '@/components/ui/badge'
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
import { useAcknowledgeTaskEscalation } from '@/hooks/useProjectGovernance'
import { useFactories } from '@/hooks/useFactories'
import { useListQueryState } from '@/hooks/useListQueryState'
import { formatFactoryLabel, formatLocalizedDateTime } from '@/lib/i18n-format'
import { buildFactoryFilterOptions } from '@/lib/list-filters'
import type { EscalationsPageParams } from '@/lib/list-query-params'
import { toastMutationError } from '@/lib/mutation-error'
import { buildProjectPath } from '@/lib/project-routes'
import { isCompanyDirector } from '@/lib/roles'
import { canGovernExecution } from '@/lib/wbs'
import {
  formatEscalationBody,
  type EscalationFormValues,
} from '@/lib/validations/comment'
import type { EscalationStatus } from '@/types/database'

function escalationStatusOf(task: EscalationItem): EscalationStatus {
  return task.escalation_status ?? 'open'
}

export function EscalationsPage() {
  const { t, locale } = useTranslation()
  const { profile } = useAuth()
  const isDirector = isCompanyDirector(profile?.role)
  const listState = useListQueryState({
    factoryId: 'all',
    escalationStatus: 'open',
  })
  const { data: factories = [] } = useFactories()
  const { data, isLoading, error, refetch, isFetching } = useEscalationsPage({
    page: listState.page,
    pageSize: listState.pageSize,
    search: listState.debouncedSearch,
    factoryId: listState.filters.factoryId,
    escalationStatus: listState.filters
      .escalationStatus as EscalationsPageParams['escalationStatus'],
  })
  const escalations = data?.items ?? []
  const total = data?.total ?? 0
  const [selectedTask, setSelectedTask] = useState<EscalationItem | null>(null)
  const createComment = useCreateComment('task', selectedTask?.id)
  const acknowledgeEscalation = useAcknowledgeTaskEscalation()
  const notAvailable = t('common.notAvailable')

  const handleEscalationSubmit = async (values: EscalationFormValues) => {
    if (!selectedTask) {
      return
    }

    try {
      await createComment.mutateAsync({
        values: { body: formatEscalationBody(values.message) },
      })
      toast.success(t('escalations.sent'))
      setSelectedTask(null)
    } catch (submitError) {
      toastMutationError(submitError, t('escalations.sendFailed'))
      throw submitError
    }
  }

  const handleAcknowledge = async (task: EscalationItem) => {
    try {
      await acknowledgeEscalation.mutateAsync({ taskId: task.id })
      toast.success(t('escalations.acknowledged'))
    } catch (submitError) {
      toastMutationError(submitError, t('escalations.acknowledgeFailed'), t)
    }
  }

  const statusFilters = [
    {
      id: 'escalation-status-filter',
      label: t('escalations.status'),
      value: listState.filters.escalationStatus,
      onChange: (value: string) =>
        listState.setFilter('escalationStatus', value),
      options: [
        { value: 'all', label: t('escalations.statusAll') },
        { value: 'open', label: t('escalations.statusOpen') },
        {
          value: 'acknowledged',
          label: t('escalations.statusAcknowledged'),
        },
      ],
    },
  ]

  const factoryFilter = isDirector
    ? [
        {
          id: 'escalation-factory-filter',
          label: t('common.factory'),
          value: listState.filters.factoryId,
          onChange: (value: string) => listState.setFilter('factoryId', value),
          options: buildFactoryFilterOptions(
            factories,
            t('list.allFactories'),
          ),
        },
      ]
    : []

  const canAcknowledgeTask = (task: EscalationItem) => {
    if (!task.projects) {
      return false
    }

    if (escalationStatusOf(task) !== 'open') {
      return false
    }

    return canGovernExecution(
      { factory_id: task.projects.factory_id },
      profile,
    )
  }

  const renderActions = (task: EscalationItem) => (
    <div className="flex flex-wrap justify-end gap-2">
      {canAcknowledgeTask(task) ? (
        <Button
          size="sm"
          onClick={() => void handleAcknowledge(task)}
          disabled={acknowledgeEscalation.isPending}
        >
          {t('escalations.acknowledge')}
        </Button>
      ) : null}
      <Button
        size="sm"
        variant="outline"
        onClick={() => setSelectedTask(task)}
      >
        {t('common.escalate')}
      </Button>
    </div>
  )

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
          filters={[...statusFilters, ...factoryFilter]}
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
          <Badge variant="outline">
            {t(`escalations.statusLabels.${escalationStatusOf(task)}`)}
          </Badge>
          <p className="text-sm">
            <span className="font-medium text-muted-foreground">
              {t('escalations.project')}:{' '}
            </span>
            {task.projects ? (
              <Link
                className="font-medium hover:underline"
                to={buildProjectPath(task.projects)}
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
          {renderActions(task)}
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
            <TableHead>{t('escalations.status')}</TableHead>
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
                    to={buildProjectPath(task.projects)}
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
              <TableCell>
                <Badge variant="outline">
                  {t(`escalations.statusLabels.${escalationStatusOf(task)}`)}
                </Badge>
              </TableCell>
              <TableCell className="max-w-xs text-sm text-destructive">
                {task.blocked_reason ?? notAvailable}
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {formatLocalizedDateTime(task.updated_at, locale)}
              </TableCell>
              <TableCell className="text-end">{renderActions(task)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PaginatedListPage>
  )
}
