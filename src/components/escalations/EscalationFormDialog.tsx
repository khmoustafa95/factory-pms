import { zodResolver } from '@hookform/resolvers/zod'
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
import { Textarea } from '@/components/ui/textarea'
import { useTranslation } from '@/contexts/LocaleContext'
import { useFormDialog } from '@/hooks/useFormDialog'
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

const ESCALATION_FORM_DEFAULTS: EscalationFormValues = {
  message: '',
}

export function EscalationFormDialog({
  open,
  onOpenChange,
  taskTitle,
  initialMessage = '',
  onSubmit,
  isSubmitting,
}: EscalationFormDialogProps) {
  const { t } = useTranslation()
  const escalationFormSchema = useValidationSchema(createEscalationFormSchema)

  const { form, createSubmitHandler } = useFormDialog({
    open,
    resolver: zodResolver(escalationFormSchema),
    defaultValues: ESCALATION_FORM_DEFAULTS,
    getValues: () => ({ message: initialMessage }),
    resetDependencies: [initialMessage],
  })

  const handleSubmit = createSubmitHandler(onSubmit, () => onOpenChange(false))

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

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <Textarea rows={4} {...form.register('message')} />
            <FormFieldError error={form.formState.errors.message} />
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
              {isSubmitting ? t('common.sending') : t('common.sendEscalation')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
