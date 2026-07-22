import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
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
import { useTranslation } from '@/contexts/LocaleContext'
import type { Factory } from '@/types/database'
import { useValidationSchema } from '@/hooks/useValidationSchema'
import {
  createFactoryFormSchema,
  type FactoryFormValues,
} from '@/lib/validations/factory'

interface FactoryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  factory?: Factory | null
  onSubmit: (values: FactoryFormValues) => Promise<void>
  isSubmitting: boolean
}

export function FactoryFormDialog({
  open,
  onOpenChange,
  factory,
  onSubmit,
  isSubmitting,
}: FactoryFormDialogProps) {
  const { t, locale } = useTranslation()
  const factoryFormSchema = useValidationSchema(createFactoryFormSchema)

  const form = useForm<FactoryFormValues>({
    resolver: zodResolver(factoryFormSchema),
    defaultValues: {
      name: '',
      code: '',
      location: '',
      is_active: true,
    },
  })

  const isActive = useWatch({ control: form.control, name: 'is_active' })

  useEffect(() => {
    if (!open) {
      return
    }

    form.reset({
      name: factory?.name ?? '',
      code: factory?.code ?? '',
      location: factory?.location ?? '',
      is_active: factory?.is_active ?? true,
    })
  }, [factory, form, open])

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values)
    onOpenChange(false)
  })

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

        <form key={locale} className="space-y-4" onSubmit={handleSubmit}>
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
