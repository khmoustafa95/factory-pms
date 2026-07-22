import { useState } from 'react'
import { toast } from 'sonner'
import { AccountFormDialog } from '@/components/accounts/AccountFormDialog'
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
import { useAccounts, useUpdateAccount } from '@/hooks/useAccounts'
import { USER_ROLE_LABELS } from '@/lib/roles'
import type { Profile, UserRole } from '@/types/database'

type EditableAccount = Profile & {
  factories: { name: string; code: string } | null
}

export function AccountsPage() {
  const { data: accounts = [], isLoading, error } = useAccounts()
  const updateAccount = useUpdateAccount()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<EditableAccount | null>(
    null,
  )

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
      toast.success('Account updated')
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Unable to update account'
      toast.error(message)
      throw submitError
    }
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Accounts</h1>
        <p className="max-w-2xl text-slate-600">
          Provision users in Supabase Auth, then assign their role and factory
          scope here. Company directors see every account.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading accounts…</p>
      ) : null}

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Failed to load accounts'}
        </p>
      ) : null}

      {!isLoading && !error ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Factory</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-slate-500"
                  >
                    No accounts found. Create users in Supabase Auth first.
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">
                      {account.full_name}
                    </TableCell>
                    <TableCell>{account.email}</TableCell>
                    <TableCell>
                      {USER_ROLE_LABELS[account.role as UserRole]}
                    </TableCell>
                    <TableCell>
                      {account.factories
                        ? `${account.factories.name} (${account.factories.code})`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={account.is_active ? 'default' : 'secondary'}
                      >
                        {account.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(account)}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : null}

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
