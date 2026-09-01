import { zodResolver } from '@hookform/resolvers/zod'
import { useWatch } from 'react-hook-form'
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
import { useTranslation } from '@/contexts/LocaleContext'
import { useFormDialog } from '@/hooks/useFormDialog'
import { useValidationSchema } from '@/hooks/useValidationSchema'
import {
  createFactoryFormSchema,
  type FactoryFormValues,
} from '@/lib/validations/factory'
import type { Factory } from '@/types/database'

interface FactoryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  factory?: Factory | null
  onSubmit: (values: FactoryFormValues) => Promise<void>
  isSubmitting: boolean
}

const FACTORY_FORM_DEFAULTS: FactoryFormValues = {
  name: '',
  code: '',
  location: '',
  is_active: true,
}

export function FactoryFormDialog({
  open,
  onOpenChange,
  factory,
  onSubmit,
  isSubmitting,
}: FactoryFormDialogProps) {
  const { t } = useTranslation()
  const factoryFormSchema = useValidationSchema(createFactoryFormSchema)

  const { form, createSubmitHandler } = useFormDialog({
    open,
    resolver: zodResolver(factoryFormSchema),
    defaultValues: FACTORY_FORM_DEFAULTS,
    getValues: () => ({
      name: factory?.name ?? '',
      code: factory?.code ?? '',
      location: factory?.location ?? '',
      is_active: factory?.is_active ?? true,
    }),
    resetDependencies: [factory],
  })

  const isActive = useWatch({ control: form.control, name: 'is_active' })
  const handleSubmit = createSubmitHandler(onSubmit, () => onOpenChange(false))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {factory ? t('factories.editFactory') : t('factories.newFactory')}
          </DialogTitle>
          <DialogDescription>
            {t('factories.formDescription')}
          </DialogDescription>
        </DialogHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="factory-name">{t('common.name')}</Label>
              <Input id="factory-name" {...form.register('name')} />
              <FormFieldError error={form.formState.errors.name} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="factory-code">{t('common.code')}</Label>
              <Input
                id="factory-code"
                className="uppercase"
                {...form.register('code')}
              />
              <FormFieldError error={form.formState.errors.code} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="factory-location">{t('common.location')}</Label>
              <Input id="factory-location" {...form.register('location')} />
            </div>

            <FormCheckboxField
              id="factory-active"
              label={t('factories.activeFactory')}
              checked={isActive}
              onCheckedChange={(checked) => form.setValue('is_active', checked)}
            />
          </DialogBody>

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
