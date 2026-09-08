import { zodResolver } from '@hookform/resolvers/zod'
import { useWatch } from 'react-hook-form'
import { DatePickerField } from '@/components/DatePicker'
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
import { useTranslation } from '@/contexts/LocaleContext'
import { useFormDialog } from '@/hooks/useFormDialog'
import { useFormDialogClose } from '@/hooks/useFormDialogClose'
import { useValidationSchema } from '@/hooks/useValidationSchema'
import { formatDurationLabel } from '@/lib/duration'
import {
  createProjectScheduleSchema,
  endDateFromStartAndMonths,
  type ProjectScheduleFormValues,
} from '@/lib/validations/project'

interface ProjectScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  durationMonths: number | null
  currentStart: string | null
  currentEnd: string | null
  onSubmit: (values: ProjectScheduleFormValues) => Promise<void>
  isSubmitting: boolean
}

export function ProjectScheduleDialog({
  open,
  onOpenChange,
  durationMonths,
  currentStart,
  currentEnd,
  onSubmit,
  isSubmitting,
}: ProjectScheduleDialogProps) {
  const { t } = useTranslation()
  const schema = useValidationSchema(createProjectScheduleSchema)
  const { form, createSubmitHandler, isDirty } = useFormDialog({
    open,
    resolver: zodResolver(schema),
    defaultValues: { proposed_start_date: '', proposed_end_date: '' },
    getValues: () => ({
      proposed_start_date: currentStart ?? '',
      proposed_end_date: currentEnd ?? '',
    }),
    resetDependencies: [currentStart, currentEnd],
  })
  const { discardOpen, handleOpenChange, confirmDiscard, cancelDiscard } =
    useFormDialogClose(isDirty, onOpenChange)
  const handleSubmit = createSubmitHandler(onSubmit, () => onOpenChange(false))
  const startDate = useWatch({
    control: form.control,
    name: 'proposed_start_date',
  })

  const suggestedEnd =
    startDate && durationMonths != null && durationMonths > 0
      ? endDateFromStartAndMonths(startDate, durationMonths)
      : null

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('projects.scheduleDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('projects.scheduleDialog.description')}
            </DialogDescription>
          </DialogHeader>

          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={handleSubmit}
          >
            <DialogBody className="space-y-4">
              {durationMonths != null ? (
                <p className="text-sm text-muted-foreground">
                  {t('projects.scheduleDialog.contractDuration')}:{' '}
                  {formatDurationLabel(t, durationMonths, 'month')}
                </p>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="schedule-start">
                  {t('projects.proposedStartDate')}
                </Label>
                <DatePickerField
                  id="schedule-start"
                  control={form.control}
                  name="proposed_start_date"
                  allowClear
                />
                <FormFieldError
                  error={form.formState.errors.proposed_start_date}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule-end">
                  {t('projects.proposedEndDate')}
                </Label>
                <DatePickerField
                  id="schedule-end"
                  control={form.control}
                  name="proposed_end_date"
                  allowClear
                />
                <FormFieldError
                  error={form.formState.errors.proposed_end_date}
                />
                {suggestedEnd ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      {t('projects.scheduleDialog.suggestedEnd', {
                        date: suggestedEnd,
                      })}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        form.setValue('proposed_end_date', suggestedEnd, {
                          shouldDirty: true,
                        })
                      }
                    >
                      {t('projects.scheduleDialog.useSuggested')}
                    </Button>
                  </div>
                ) : null}
              </div>
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
                  : t('projects.scheduleDialog.submit')}
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
