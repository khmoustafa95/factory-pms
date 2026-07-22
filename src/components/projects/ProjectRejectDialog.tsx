import { zodResolver } from '@hookform/resolvers/zod'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useTranslation } from '@/contexts/LocaleContext'
import { useFormDialog } from '@/hooks/useFormDialog'
import { useValidationSchema } from '@/hooks/useValidationSchema'
import {
  createProjectRejectSchema,
  type ProjectRejectValues,
} from '@/lib/validations/approval'

interface ProjectRejectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectTitle: string | null
  onSubmit: (values: ProjectRejectValues) => Promise<void>
  isSubmitting: boolean
}

const REJECT_FORM_DEFAULTS: ProjectRejectValues = {
  rejection_reason: '',
}

export function ProjectRejectDialog({
  open,
  onOpenChange,
  projectTitle,
  onSubmit,
  isSubmitting,
}: ProjectRejectDialogProps) {
  const { t, locale } = useTranslation()
  const projectRejectSchema = useValidationSchema(createProjectRejectSchema)

  const { form, createSubmitHandler } = useFormDialog({
    open,
    resolver: zodResolver(projectRejectSchema),
    defaultValues: REJECT_FORM_DEFAULTS,
    getValues: () => ({ rejection_reason: '' }),
  })

  const handleSubmit = createSubmitHandler(onSubmit, () => onOpenChange(false))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('projects.rejectProposal')}</DialogTitle>
          <DialogDescription>
            {projectTitle
              ? `${t('projects.rejectDescription')} (${projectTitle})`
              : t('projects.rejectDescription')}
          </DialogDescription>
        </DialogHeader>

        <form key={locale} className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">
              {t('projects.rejectionReason')}
            </Label>
            <Textarea
              id="rejection-reason"
              rows={4}
              {...form.register('rejection_reason')}
            />
            <FormFieldError error={form.formState.errors.rejection_reason} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting
                ? t('common.submitting')
                : t('projects.rejectProposal')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
