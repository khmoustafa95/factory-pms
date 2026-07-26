import { KeyRound, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ActiveStatusBadge } from '@/components/ActiveStatusBadge'
import { AccountFormDialog } from '@/components/accounts/AccountFormDialog'
import { GeneratedPasswordDialog } from '@/components/accounts/GeneratedPasswordDialog'
import { ListToolbar, type ListFilterConfig } from '@/components/ListToolbar'
import { PageHeader } from '@/components/PageHeader'
import { PaginatedListPage } from '@/components/PaginatedListPage'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  useAccountsPage,
  useCreateAccount,
  useResetAccountPassword,
  useUpdateAccount,
  type ProfileWithFactory,
} from '@/hooks/useAccounts'
import { useEditDialog } from '@/hooks/useEditDialog'
import { useFactories } from '@/hooks/useFactories'
import { useListQueryState } from '@/hooks/useListQueryState'
import {
  canManageAccountRole,
  getManagedRoles,
} from '@/lib/account-permissions'
import { formatFactoryLabel, getRoleLabel } from '@/lib/i18n-format'
import {
  buildFactoryFilterOptions,
  getActiveInactiveFilterOptions,
} from '@/lib/list-filters'
import { isFactoryManager } from '@/lib/roles'
import { toastMutationError } from '@/lib/mutation-error'
import type { AccountDialogFormValues } from '@/lib/validations/account'
import type { UserRole } from '@/types/database'

export function AccountsPage() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const isFm = isFactoryManager(profile?.role)
  const managedRoles = useMemo(
    () => getManagedRoles(profile?.role),
    [profile?.role],
  )
  const lockFactoryId = isFm ? (profile?.factory_id ?? null) : null

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
    factoryId: isFm
      ? (profile?.factory_id ?? 'all')
      : listState.filters.factoryId,
    status: listState.filters.status as 'all' | 'active' | 'inactive',
  })
  const accounts = data?.items ?? []
  const total = data?.total ?? 0
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()
  const resetPassword = useResetAccountPassword()
  const {
    open: dialogOpen,
    setOpen: setDialogOpen,
    editingItem: editingAccount,
    openCreate,
    openEdit,
  } = useEditDialog<ProfileWithFactory>()
  const notAvailable = t('common.notAvailable')

  const [passwordReveal, setPasswordReveal] = useState<{
    email?: string
    password: string
  } | null>(null)
  const [resetTarget, setResetTarget] = useState<ProfileWithFactory | null>(
    null,
  )

  const roleFilterOptions = [
    { value: 'all', label: t('list.allRoles') },
    ...managedRoles.map((role) => ({
      value: role,
      label: getRoleLabel(t, role),
    })),
  ]

  const handleCreate = async (values: AccountDialogFormValues) => {
    try {
      const result = await createAccount.mutateAsync(values)
      toast.success(t('accounts.created'))
      setPasswordReveal({
        email: result.email ?? values.email,
        password: result.password,
      })
    } catch (submitError) {
      toastMutationError(submitError, t('accounts.createFailed'))
      throw submitError
    }
  }

  const handleUpdate = async (values: AccountDialogFormValues) => {
    if (!editingAccount) {
      return
    }

    try {
      await updateAccount.mutateAsync({
        id: editingAccount.id,
        values: {
          full_name: values.full_name,
          role: values.role,
          factory_id: values.factory_id,
          is_active: values.is_active,
        },
      })
      toast.success(t('accounts.updated'))
    } catch (submitError) {
      toastMutationError(submitError, t('accounts.updateFailed'))
      throw submitError
    }
  }

  const handleResetPassword = async () => {
    if (!resetTarget) {
      return
    }

    try {
      const result = await resetPassword.mutateAsync(resetTarget.id)
      toast.success(t('accounts.passwordReset'))
      setResetTarget(null)
      setPasswordReveal({
        email: resetTarget.email,
        password: result.password,
      })
    } catch (submitError) {
      toastMutationError(submitError, t('accounts.passwordResetFailed'))
    }
  }

  const filters: ListFilterConfig[] = [
    {
      id: 'account-role-filter',
      label: t('accounts.role'),
      value: listState.filters.role,
      onChange: (value) => listState.setFilter('role', value),
      options: roleFilterOptions,
    },
  ]

  if (!isFm) {
    filters.push({
      id: 'account-factory-filter',
      label: t('common.factory'),
      value: listState.filters.factoryId,
      onChange: (value) => listState.setFilter('factoryId', value),
      options: buildFactoryFilterOptions(factories, t('list.allFactories')),
    })
  }

  filters.push({
    id: 'account-status-filter',
    label: t('common.status'),
    value: listState.filters.status,
    onChange: (value) => listState.setFilter('status', value),
    options: getActiveInactiveFilterOptions(t),
  })

  return (
    <PaginatedListPage
      header={
        <PageHeader
          title={t('accounts.title')}
          description={
            isFm
              ? t('accounts.descriptionFactoryManager')
              : t('accounts.description')
          }
          actions={
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              {t('common.addAccount')}
            </Button>
          }
        />
      }
      toolbar={
        <ListToolbar
          search={listState.search}
          onSearchChange={listState.setSearch}
          searchPlaceholder={t('list.searchAccounts')}
          hasActiveFilters={listState.hasActiveFilters}
          onClear={listState.clearAll}
          filters={filters}
        />
      }
      items={accounts}
      total={total}
      page={listState.page}
      pageSize={listState.pageSize}
      onPageChange={listState.setPage}
      onPageSizeChange={listState.setPageSize}
      emptyMessage={
        listState.hasActiveFilters ? t('list.noResults') : t('accounts.empty')
      }
      getKey={(account) => account.id}
      renderMobileCard={(account) => {
        const canManage = canManageAccountRole(
          profile?.role,
          account.role as UserRole,
        )
        return (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">{account.full_name}</p>
              <ActiveStatusBadge isActive={account.is_active} />
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
                  ? formatFactoryLabel(account.factories)
                  : notAvailable}
              </p>
            </div>
            {canManage ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEdit(account)}
                >
                  {t('common.edit')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setResetTarget(account)}
                >
                  <KeyRound className="size-4" />
                  {t('accounts.resetPassword')}
                </Button>
              </div>
            ) : null}
          </div>
        )
      }}
      query={{
        isLoading,
        error,
        loadingMessage: t('accounts.loading'),
        errorMessage: t('accounts.loadFailed'),
        onRetry: () => void refetch(),
        isRetrying: isFetching,
      }}
      footer={
        <>
          <AccountFormDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            account={editingAccount}
            allowedRoles={managedRoles}
            lockFactoryId={lockFactoryId}
            onCreate={handleCreate}
            onUpdate={handleUpdate}
            isSubmitting={createAccount.isPending || updateAccount.isPending}
          />
          <GeneratedPasswordDialog
            open={passwordReveal !== null}
            onOpenChange={(open) => {
              if (!open) {
                setPasswordReveal(null)
              }
            }}
            email={passwordReveal?.email}
            password={passwordReveal?.password ?? null}
          />
          <Dialog
            open={resetTarget !== null}
            onOpenChange={(open) => {
              if (!open) {
                setResetTarget(null)
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('accounts.resetPasswordTitle')}</DialogTitle>
                <DialogDescription>
                  {t('accounts.resetPasswordDescription', {
                    name: resetTarget?.full_name ?? '',
                    email: resetTarget?.email ?? '',
                  })}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResetTarget(null)}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="button"
                  disabled={resetPassword.isPending}
                  onClick={() => void handleResetPassword()}
                >
                  {resetPassword.isPending
                    ? t('common.saving')
                    : t('accounts.confirmResetPassword')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('common.name')}</TableHead>
            <TableHead>{t('common.email')}</TableHead>
            <TableHead>{t('accounts.role')}</TableHead>
            <TableHead>{t('common.factory')}</TableHead>
            <TableHead>{t('common.status')}</TableHead>
            <TableHead className="text-end">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => {
            const canManage = canManageAccountRole(
              profile?.role,
              account.role as UserRole,
            )
            return (
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
                    ? formatFactoryLabel(account.factories)
                    : notAvailable}
                </TableCell>
                <TableCell>
                  <ActiveStatusBadge isActive={account.is_active} />
                </TableCell>
                <TableCell className="text-end">
                  {canManage ? (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(account)}
                      >
                        {t('common.edit')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setResetTarget(account)}
                      >
                        <KeyRound className="size-4" />
                        {t('accounts.resetPassword')}
                      </Button>
                    </div>
                  ) : null}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </PaginatedListPage>
  )
}
