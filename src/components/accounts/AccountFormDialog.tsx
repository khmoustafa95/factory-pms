import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslation } from '@/contexts/LocaleContext'
import { useFactories } from '@/hooks/useFactories'
import { getRoleLabel } from '@/lib/i18n-format'
import {
  accountFormSchema,
  type AccountFormValues,
} from '@/lib/validations/account'
import type { UserRole } from '@/types/database'

const USER_ROLES = [
  'company_director',
  'factory_manager',
  'project_manager',
] as const satisfies readonly UserRole[]

interface AccountFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: {
    id: string
    email: string
    full_name: string
    role: UserRole
    factory_id: string | null
    is_active: boolean
  } | null
  onSubmit: (values: AccountFormValues) => Promise<void>
  isSubmitting: boolean
}

export function AccountFormDialog({
  open,
  onOpenChange,
  account,
  onSubmit,
  isSubmitting,
}: AccountFormDialogProps) {
  const { t } = useTranslation()
  const { data: factories = [] } = useFactories()

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      full_name: '',
      role: 'project_manager',
      factory_id: null,
      is_active: true,
    },
  })

  const selectedRole = useWatch({ control: form.control, name: 'role' })
  const selectedFactoryId = useWatch({
    control: form.control,
    name: 'factory_id',
  })

  useEffect(() => {
    if (!open || !account) {
      return
    }

    form.reset({
      full_name: account.full_name,
      role: account.role,
      factory_id: account.factory_id,
      is_active: account.is_active,
    })
  }, [account, form, open])

  useEffect(() => {
    if (selectedRole === 'company_director') {
      form.setValue('factory_id', null)
    }
  }, [form, selectedRole])

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values)
    onOpenChange(false)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('accounts.editAccount')}</DialogTitle>
          <DialogDescription>{account?.email}</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="account-name">{t('accounts.fullName')}</Label>
            <Input id="account-name" {...form.register('full_name')} />
            {form.formState.errors.full_name ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.full_name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>{t('accounts.role')}</Label>
            <Select
              value={selectedRole}
              onValueChange={(value) => {
                if (
                  value === 'company_director' ||
                  value === 'factory_manager' ||
                  value === 'project_manager'
                ) {
                  form.setValue('role', value)
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {USER_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {getRoleLabel(t, role)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedRole !== 'company_director' ? (
            <div className="space-y-2">
              <Label>{t('common.factory')}</Label>
              <Select
                value={selectedFactoryId ?? undefined}
                onValueChange={(value) => form.setValue('factory_id', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {factories
                    .filter((factory) => factory.is_active)
                    .map((factory) => (
                      <SelectItem key={factory.id} value={factory.id}>
                        {factory.name} ({factory.code})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {form.formState.errors.factory_id ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.factory_id.message}
                </p>
              ) : null}
            </div>
          ) : null}

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register('is_active')} />
            {t('accounts.activeAccount')}
          </label>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
