import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useWatch } from 'react-hook-form'
import { DiscardChangesDialog } from '@/components/DiscardChangesDialog'
import { FormCheckboxField } from '@/components/FormCheckboxField'
import { FormFieldError } from '@/components/FormFieldError'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
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
import { useFormDialog } from '@/hooks/useFormDialog'
import { useFormDialogClose } from '@/hooks/useFormDialogClose'
import { useValidationSchema } from '@/hooks/useValidationSchema'
import { formatFactoryLabel, getRoleLabel } from '@/lib/i18n-format'
import {
  createAccountDialogSchema,
  type AccountDialogFormValues,
} from '@/lib/validations/account'
import type { UserRole } from '@/types/database'

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
  allowedRoles: UserRole[]
  lockFactoryId?: string | null
  onCreate: (values: AccountDialogFormValues) => Promise<void>
  onUpdate: (values: AccountDialogFormValues) => Promise<void>
  isSubmitting: boolean
}

export function AccountFormDialog({
  open,
  onOpenChange,
  account,
  allowedRoles,
  lockFactoryId,
  onCreate,
  onUpdate,
  isSubmitting,
}: AccountFormDialogProps) {
  const { t } = useTranslation()
  const { data: factories = [] } = useFactories()
  const isCreate = account === null
  const defaultRole = allowedRoles[0] ?? 'project_manager'

  const schema = useValidationSchema(
    (translator) =>
      createAccountDialogSchema(translator, isCreate ? 'create' : 'edit'),
    [isCreate],
  )

  const { form, createSubmitHandler, isDirty } = useFormDialog<AccountDialogFormValues>({
    open,
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      full_name: '',
      role: defaultRole,
      factory_id: lockFactoryId ?? null,
      is_active: true,
    },
    getValues: () => ({
      email: account?.email ?? '',
      full_name: account?.full_name ?? '',
      role: account?.role ?? defaultRole,
      factory_id: account?.factory_id ?? lockFactoryId ?? null,
      is_active: account?.is_active ?? true,
    }),
    resetDependencies: [account, lockFactoryId, defaultRole, isCreate],
  })

  const { discardOpen, handleOpenChange, confirmDiscard, cancelDiscard } =
    useFormDialogClose(isDirty, onOpenChange)

  const selectedRole = useWatch({ control: form.control, name: 'role' })
  const selectedFactoryId = useWatch({
    control: form.control,
    name: 'factory_id',
  })
  const isActive = useWatch({ control: form.control, name: 'is_active' })
  const factoryLocked = Boolean(lockFactoryId)

  useEffect(() => {
    if (lockFactoryId) {
      form.setValue('factory_id', lockFactoryId)
    }
  }, [form, lockFactoryId])

  useEffect(() => {
    if (
      selectedRole &&
      !allowedRoles.includes(selectedRole) &&
      allowedRoles[0]
    ) {
      form.setValue('role', allowedRoles[0])
    }
  }, [allowedRoles, form, selectedRole])

  const handleSubmit = createSubmitHandler(
    async (values) => {
      if (isCreate) {
        await onCreate(values)
        return
      }
      await onUpdate(values)
    },
    () => onOpenChange(false),
  )

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isCreate ? t('accounts.newAccount') : t('accounts.editAccount')}
          </DialogTitle>
          <DialogDescription>
            {isCreate
              ? t('accounts.createDescription')
              : (account?.email ?? '')}
          </DialogDescription>
        </DialogHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            {isCreate ? (
              <div className="space-y-2">
                <Label htmlFor="account-email">{t('common.email')}</Label>
                <Input
                  id="account-email"
                  type="email"
                  autoComplete="off"
                  {...form.register('email')}
                />
                <FormFieldError error={form.formState.errors.email} />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="account-name">{t('accounts.fullName')}</Label>
              <Input id="account-name" {...form.register('full_name')} />
              <FormFieldError error={form.formState.errors.full_name} />
            </div>

            <div className="space-y-2">
              <Label>{t('accounts.role')}</Label>
              <Select
                value={selectedRole}
                onValueChange={(value) => {
                  if (allowedRoles.includes(value as UserRole)) {
                    form.setValue('role', value as UserRole)
                  }
                }}
                disabled={!isCreate && allowedRoles.length <= 1}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowedRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {getRoleLabel(t, role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('common.factory')}</Label>
              <Select
                value={selectedFactoryId ?? undefined}
                onValueChange={(value) => form.setValue('factory_id', value)}
                disabled={factoryLocked}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {factories
                    .filter((factory) => factory.is_active)
                    .map((factory) => (
                      <SelectItem key={factory.id} value={factory.id}>
                        {formatFactoryLabel(factory)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FormFieldError error={form.formState.errors.factory_id} />
            </div>

            <FormCheckboxField
              id="account-active"
              label={t('accounts.activeAccount')}
              checked={isActive}
              onCheckedChange={(checked) => form.setValue('is_active', checked)}
            />
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? t('common.saving')
                : isCreate
                  ? t('accounts.createAccount')
                  : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      </Dialog>
      <DiscardChangesDialog
        open={discardOpen}
        onConfirm={confirmDiscard}
        onCancel={cancelDiscard}
      />
    </>
  )
}
