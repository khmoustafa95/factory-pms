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
  createProjectPauseSchema,
  type ProjectPauseValues,
} from '@/lib/validations/approval'

interface ProjectPauseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectTitle: string | null
  onSubmit: (values: ProjectPauseValues) => Promise<void>
  isSubmitting: boolean
}

const PAUSE_FORM_DEFAULTS: ProjectPauseValues = {
  pause_reason: '',
}

export function ProjectPauseDialog({
  open,
  onOpenChange,
  projectTitle,
  onSubmit,
  isSubmitting,
}: ProjectPauseDialogProps) {
  const { t, locale } = useTranslation()
  const projectPauseSchema = useValidationSchema(createProjectPauseSchema)

  const { form, createSubmitHandler } = useFormDialog({
    open,
    resolver: zodResolver(projectPauseSchema),
    defaultValues: PAUSE_FORM_DEFAULTS,
    getValues: () => ({ pause_reason: '' }),
  })

  const handleSubmit = createSubmitHandler(onSubmit, () => onOpenChange(false))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('projects.pauseProject')}</DialogTitle>
          <DialogDescription>
            {projectTitle
              ? `${t('projects.pauseDescription')} (${projectTitle})`
              : t('projects.pauseDescription')}
          </DialogDescription>
        </DialogHeader>

        <form key={locale} className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="pause-reason">{t('projects.pauseReason')}</Label>
            <Textarea
              id="pause-reason"
              rows={4}
              {...form.register('pause_reason')}
            />
            <FormFieldError error={form.formState.errors.pause_reason} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="secondary" disabled={isSubmitting}>
              {isSubmitting
                ? t('common.submitting')
                : t('common.pauseExecution')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
