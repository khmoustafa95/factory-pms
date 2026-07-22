import { useState } from 'react'
import { toast } from 'sonner'
import { AdaptiveList } from '@/components/AdaptiveList'
import { AccountFormDialog } from '@/components/accounts/AccountFormDialog'
import { ListPagination } from '@/components/ListPagination'
import { ListToolbar } from '@/components/ListToolbar'
import { PageHeader } from '@/components/PageHeader'
import { QueryState } from '@/components/QueryState'
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
import { useTranslation } from '@/contexts/LocaleContext'
import { useAccountsPage, useUpdateAccount } from '@/hooks/useAccounts'
import { useFactories } from '@/hooks/useFactories'
import { useListQueryState } from '@/hooks/useListQueryState'
import { getRoleLabel } from '@/lib/i18n-format'
import type { Profile, UserRole } from '@/types/database'

type EditableAccount = Profile & {
  factories: { name: string; code: string } | null
}

export function AccountsPage() {
  const { t } = useTranslation()
  const listState = useListQueryState({
    role: 'all',
    factoryId: 'all',
    status: 'all',
  })
  const { data: factories = [] } = useFactories()
  const { data, isLoading, error, refetch, isFetching } = useAccountsPage({
    page: listState.page,
    pageSize: listState.pageSize,
    search: listState.debouncedSearch,
    role: listState.filters.role as
      'all' | 'company_director' | 'factory_manager' | 'project_manager',
    factoryId: listState.filters.factoryId,
    status: listState.filters.status as 'all' | 'active' | 'inactive',
  })
  const accounts = data?.items ?? []
  const total = data?.total ?? 0
  const updateAccount = useUpdateAccount()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<EditableAccount | null>(
    null,
  )
  const notAvailable = t('common.notAvailable')

  const openEdit = (account: EditableAccount) => {
    setEditingAccount(account)
    setDialogOpen(true)
  }

  const handleSubmit = async (
    values: Parameters<typeof updateAccount.mutateAsync>[0]['values'],
  ) => {
    if (!editingAccount) {
      return
    }

    try {
      await updateAccount.mutateAsync({ id: editingAccount.id, values })
      toast.success(t('accounts.updated'))
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : t('accounts.updateFailed')
      toast.error(message)
      throw submitError
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title={t('accounts.title')}
        description={t('accounts.description')}
      />

      <ListToolbar
        search={listState.search}
        onSearchChange={listState.setSearch}
        searchPlaceholder={t('list.searchAccounts')}
        hasActiveFilters={listState.hasActiveFilters}
        onClear={listState.clearAll}
        filters={[
          {
            id: 'account-role-filter',
            label: t('accounts.role'),
            value: listState.filters.role,
            onChange: (value) => listState.setFilter('role', value),
            options: [
              { value: 'all', label: t('list.allRoles') },
              {
                value: 'company_director',
                label: getRoleLabel(t, 'company_director'),
              },
              {
                value: 'factory_manager',
                label: getRoleLabel(t, 'factory_manager'),
              },
              {
                value: 'project_manager',
                label: getRoleLabel(t, 'project_manager'),
              },
            ],
          },
          {
            id: 'account-factory-filter',
            label: t('common.factory'),
            value: listState.filters.factoryId,
            onChange: (value) => listState.setFilter('factoryId', value),
            options: [
              { value: 'all', label: t('list.allFactories') },
              ...factories.map((factory) => ({
                value: factory.id,
                label: `${factory.name} (${factory.code})`,
              })),
            ],
          },
          {
            id: 'account-status-filter',
            label: t('common.status'),
            value: listState.filters.status,
            onChange: (value) => listState.setFilter('status', value),
            options: [
              { value: 'all', label: t('list.all') },
              { value: 'active', label: t('list.activeOnly') },
              { value: 'inactive', label: t('list.inactiveOnly') },
            ],
          },
        ]}
      />

      <QueryState
        isLoading={isLoading}
        error={error}
        loadingMessage={t('accounts.loading')}
        errorMessage={t('accounts.loadFailed')}
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      >
        <AdaptiveList
          items={accounts}
          emptyMessage={
            listState.hasActiveFilters
              ? t('list.noResults')
              : t('accounts.empty')
          }
          getKey={(account) => account.id}
          renderMobileCard={(account) => (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{account.full_name}</p>
                <Badge variant={account.is_active ? 'default' : 'secondary'}>
                  {account.is_active
                    ? t('common.active')
                    : t('common.inactive')}
                </Badge>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">
                    {t('common.email')}:{' '}
                  </span>
                  {account.email}
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    {t('accounts.role')}:{' '}
                  </span>
                  {getRoleLabel(t, account.role as UserRole)}
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    {t('common.factory')}:{' '}
                  </span>
                  {account.factories
                    ? `${account.factories.name} (${account.factories.code})`
                    : notAvailable}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openEdit(account)}
              >
                {t('common.edit')}
              </Button>
            </div>
          )}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.name')}</TableHead>
                <TableHead>{t('common.email')}</TableHead>
                <TableHead>{t('accounts.role')}</TableHead>
                <TableHead>{t('common.factory')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="text-right">
                  {t('common.actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">
                    {account.full_name}
                  </TableCell>
                  <TableCell>{account.email}</TableCell>
                  <TableCell>
                    {getRoleLabel(t, account.role as UserRole)}
                  </TableCell>
                  <TableCell>
                    {account.factories
                      ? `${account.factories.name} (${account.factories.code})`
                      : notAvailable}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={account.is_active ? 'default' : 'secondary'}
                    >
                      {account.is_active
                        ? t('common.active')
                        : t('common.inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(account)}
                    >
                      {t('common.edit')}
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

      <AccountFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        account={editingAccount}
        onSubmit={handleSubmit}
        isSubmitting={updateAccount.isPending}
      />
    </section>
  )
}
