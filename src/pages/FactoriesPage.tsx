import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { ActiveStatusBadge } from '@/components/ActiveStatusBadge'
import { FactoryFormDialog } from '@/components/factories/FactoryFormDialog'
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
import { useTranslation } from '@/contexts/LocaleContext'
import { useEditDialog } from '@/hooks/useEditDialog'
import {
  useCreateFactory,
  useFactoriesPage,
  useUpdateFactory,
} from '@/hooks/useFactories'
import { useListQueryState } from '@/hooks/useListQueryState'
import { getActiveInactiveFilterOptions } from '@/lib/list-filters'
import { toastMutationError } from '@/lib/mutation-error'
import type { Factory } from '@/types/database'

export function FactoriesPage() {
  const { t } = useTranslation()
  const listState = useListQueryState({ status: 'all' })
  const { data, isLoading, error, refetch, isFetching } = useFactoriesPage({
    page: listState.page,
    pageSize: listState.pageSize,
    search: listState.debouncedSearch,
    status: listState.filters.status as 'all' | 'active' | 'inactive',
  })
  const factories = data?.items ?? []
  const total = data?.total ?? 0
  const createFactory = useCreateFactory()
  const updateFactory = useUpdateFactory()
  const {
    open: dialogOpen,
    setOpen: setDialogOpen,
    editingItem: editingFactory,
    openCreate,
    openEdit,
  } = useEditDialog<Factory>()
  const notAvailable = t('common.notAvailable')

  const handleSubmit = async (
    values: Parameters<typeof createFactory.mutateAsync>[0],
  ) => {
    try {
      if (editingFactory) {
        await updateFactory.mutateAsync({ id: editingFactory.id, values })
        toast.success(t('factories.updated'))
      } else {
        await createFactory.mutateAsync(values)
        toast.success(t('factories.created'))
      }
    } catch (submitError) {
      toastMutationError(submitError, t('factories.saveFailed'))
      throw submitError
    }
  }

  return (
    <PaginatedListPage
      header={
        <PageHeader
          title={t('factories.title')}
          description={t('factories.description')}
          actions={
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              {t('common.addFactory')}
            </Button>
          }
        />
      }
      toolbar={
        <ListToolbar
          search={listState.search}
          onSearchChange={listState.setSearch}
          searchPlaceholder={t('list.searchFactories')}
          hasActiveFilters={listState.hasActiveFilters}
          onClear={listState.clearAll}
          filters={[
            {
              id: 'factory-status-filter',
              label: t('common.status'),
              value: listState.filters.status,
              onChange: (value) => listState.setFilter('status', value),
              options: getActiveInactiveFilterOptions(t),
            },
          ]}
        />
      }
      items={factories}
      total={total}
      page={listState.page}
      pageSize={listState.pageSize}
      onPageChange={listState.setPage}
      onPageSizeChange={listState.setPageSize}
      emptyMessage={
        listState.hasActiveFilters ? t('list.noResults') : t('factories.empty')
      }
      getKey={(factory) => factory.id}
      renderMobileCard={(factory) => (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium">{factory.name}</p>
            <ActiveStatusBadge isActive={factory.is_active} />
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">
                {t('common.code')}:{' '}
              </span>
              {factory.code}
            </p>
            <p>
              <span className="font-medium text-foreground">
                {t('common.location')}:{' '}
              </span>
              {factory.location ?? notAvailable}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => openEdit(factory)}>
            {t('common.edit')}
          </Button>
        </div>
      )}
      query={{
        isLoading,
        error,
        loadingMessage: t('factories.loading'),
        errorMessage: t('factories.loadFailed'),
        onRetry: () => void refetch(),
        isRetrying: isFetching,
      }}
      footer={
        <FactoryFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          factory={editingFactory}
          onSubmit={handleSubmit}
          isSubmitting={createFactory.isPending || updateFactory.isPending}
        />
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('common.name')}</TableHead>
            <TableHead>{t('common.code')}</TableHead>
            <TableHead>{t('common.location')}</TableHead>
            <TableHead>{t('common.status')}</TableHead>
            <TableHead className="text-end">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {factories.map((factory) => (
            <TableRow key={factory.id}>
              <TableCell className="font-medium">{factory.name}</TableCell>
              <TableCell>{factory.code}</TableCell>
              <TableCell>{factory.location ?? notAvailable}</TableCell>
              <TableCell>
                <ActiveStatusBadge isActive={factory.is_active} />
              </TableCell>
              <TableCell className="text-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEdit(factory)}
                >
                  {t('common.edit')}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PaginatedListPage>
  )
}
