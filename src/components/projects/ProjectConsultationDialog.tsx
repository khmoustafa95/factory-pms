import { zodResolver } from '@hookform/resolvers/zod'
import { DiscardChangesDialog } from '@/components/DiscardChangesDialog'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useTranslation } from '@/contexts/LocaleContext'
import { useFormDialog } from '@/hooks/useFormDialog'
import { useFormDialogClose } from '@/hooks/useFormDialogClose'
import { useValidationSchema } from '@/hooks/useValidationSchema'
import {
  createConsultationOpinionsSchema,
  type ConsultationOpinionsFormValues,
} from '@/lib/validations/project'
import type { Project } from '@/types/database'

interface ProjectConsultationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Pick<Project, 'title' | 'research_opinion' | 'board_opinion'>
  onSave: (values: ConsultationOpinionsFormValues) => Promise<void>
  onComplete: (values: ConsultationOpinionsFormValues) => Promise<void>
  isSaving: boolean
  isCompleting: boolean
}

const CONSULTATION_FORM_DEFAULTS: ConsultationOpinionsFormValues = {
  research_opinion: '',
  board_opinion: '',
}

export function ProjectConsultationDialog({
  open,
  onOpenChange,
  project,
  onSave,
  onComplete,
  isSaving,
  isCompleting,
}: ProjectConsultationDialogProps) {
  const { t } = useTranslation()
  const schema = useValidationSchema(createConsultationOpinionsSchema)
  const isBusy = isSaving || isCompleting

  const { form, isDirty } = useFormDialog({
    open,
    resolver: zodResolver(schema),
    defaultValues: CONSULTATION_FORM_DEFAULTS,
    getValues: () => ({
      research_opinion: project.research_opinion ?? '',
      board_opinion: project.board_opinion ?? '',
    }),
    resetDependencies: [project],
  })

  const { discardOpen, handleOpenChange, confirmDiscard, cancelDiscard } =
    useFormDialogClose(isDirty, onOpenChange)

  const applySchemaErrors = (
    issues: Array<{ path: PropertyKey[]; message: string }>,
  ) => {
    for (const issue of issues) {
      const field = String(issue.path[0] ?? '')
      if (field === 'research_opinion' || field === 'board_opinion') {
        form.setError(field, { message: issue.message })
      }
    }
  }

  const parseValues = () => {
    form.clearErrors()
    const parsed = schema.safeParse(form.getValues())
    if (!parsed.success) {
      applySchemaErrors(parsed.error.issues)
      return null
    }
    return parsed.data
  }

  const handleSave = async () => {
    const values = parseValues()
    if (!values) {
      return
    }
    await onSave(values)
    onOpenChange(false)
  }

  const handleComplete = async () => {
    const values = parseValues()
    if (!values) {
      return
    }
    await onComplete(values)
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('projects.consultationDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('projects.consultationDialog.description', {
                title: project.title,
              })}
            </DialogDescription>
          </DialogHeader>

          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => {
              event.preventDefault()
              void handleComplete()
            }}
          >
            <DialogBody className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="consultation-research-opinion">
                  {t('projects.researchOpinion')}
                </Label>
                <Textarea
                  id="consultation-research-opinion"
                  rows={4}
                  {...form.register('research_opinion')}
                />
                <FormFieldError
                  error={form.formState.errors.research_opinion}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="consultation-board-opinion">
                  {t('projects.boardOpinion')}
                </Label>
                <Textarea
                  id="consultation-board-opinion"
                  rows={4}
                  {...form.register('board_opinion')}
                />
                <FormFieldError error={form.formState.errors.board_opinion} />
              </div>
            </DialogBody>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isBusy}
                onClick={() => void handleSave()}
              >
                {isSaving
                  ? t('common.saving')
                  : t('projects.consultationDialog.save')}
              </Button>
              <Button type="submit" disabled={isBusy}>
                {isCompleting
                  ? t('common.submitting')
                  : t('projects.consultationDialog.complete')}
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
