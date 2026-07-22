import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
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
import { Textarea } from '@/components/ui/textarea'
import { useTranslation } from '@/contexts/LocaleContext'
import { useValidationSchema } from '@/hooks/useValidationSchema'
import {
  createEscalationFormSchema,
  type EscalationFormValues,
} from '@/lib/validations/comment'

interface EscalationFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskTitle: string | null
  initialMessage?: string
  onSubmit: (values: EscalationFormValues) => Promise<void>
  isSubmitting: boolean
}

export function EscalationFormDialog({
  open,
  onOpenChange,
  taskTitle,
  initialMessage = '',
  onSubmit,
  isSubmitting,
}: EscalationFormDialogProps) {
  const { t, locale } = useTranslation()
  const escalationFormSchema = useValidationSchema(createEscalationFormSchema)

  const form = useForm<EscalationFormValues>({
    resolver: zodResolver(escalationFormSchema),
    defaultValues: { message: '' },
  })

  useEffect(() => {
    if (!open) {
      return
    }

    form.reset({ message: initialMessage })
  }, [form, initialMessage, open])

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values)
    onOpenChange(false)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('escalations.escalateTitle')}</DialogTitle>
          <DialogDescription>
            {taskTitle
              ? t('escalations.escalateDescription', { title: taskTitle })
              : null}
          </DialogDescription>
        </DialogHeader>

        <form key={locale} className="space-y-4" onSubmit={handleSubmit}>
          <Textarea rows={4} {...form.register('message')} />
          <FormFieldError error={form.formState.errors.message} />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('common.sending') : t('common.sendEscalation')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
