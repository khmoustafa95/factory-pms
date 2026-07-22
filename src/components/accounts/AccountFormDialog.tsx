import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useWatch } from 'react-hook-form'
import { FormCheckboxField } from '@/components/FormCheckboxField'
import { FormFieldError } from '@/components/FormFieldError'
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
import { useFormDialog } from '@/hooks/useFormDialog'
import { formatFactoryLabel, getRoleLabel } from '@/lib/i18n-format'
import { useValidationSchema } from '@/hooks/useValidationSchema'
import {
  createAccountFormSchema,
  type AccountFormValues,
} from '@/lib/validations/account'
import type { UserRole } from '@/types/database'

const USER_ROLES = [
  'company_director',
  'factory_manager',
  'project_manager',
] as const satisfies readonly UserRole[]

const ACCOUNT_FORM_DEFAULTS: AccountFormValues = {
  full_name: '',
  role: 'project_manager',
  factory_id: null,
  is_active: true,
}

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
  const { t, locale } = useTranslation()
  const { data: factories = [] } = useFactories()
  const accountFormSchema = useValidationSchema(createAccountFormSchema)

  const { form, createSubmitHandler } = useFormDialog({
    open,
    resolver: zodResolver(accountFormSchema),
    defaultValues: ACCOUNT_FORM_DEFAULTS,
    getValues: () => ({
      full_name: account?.full_name ?? '',
      role: account?.role ?? 'project_manager',
      factory_id: account?.factory_id ?? null,
      is_active: account?.is_active ?? true,
    }),
    resetDependencies: [account],
  })

  const selectedRole = useWatch({ control: form.control, name: 'role' })
  const selectedFactoryId = useWatch({
    control: form.control,
    name: 'factory_id',
  })
  const isActive = useWatch({ control: form.control, name: 'is_active' })

  useEffect(() => {
    if (selectedRole === 'company_director') {
      form.setValue('factory_id', null)
    }
  }, [form, selectedRole])

  const handleSubmit = createSubmitHandler(onSubmit, () => onOpenChange(false))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('accounts.editAccount')}</DialogTitle>
          <DialogDescription>{account?.email}</DialogDescription>
        </DialogHeader>

        <form key={locale} className="space-y-4" onSubmit={handleSubmit}>
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
                        {formatFactoryLabel(factory)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FormFieldError error={form.formState.errors.factory_id} />
            </div>
          ) : null}

          <FormCheckboxField
            id="account-active"
            label={t('accounts.activeAccount')}
            checked={isActive}
            onCheckedChange={(checked) => form.setValue('is_active', checked)}
          />

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
