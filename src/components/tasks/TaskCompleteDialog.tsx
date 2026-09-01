import { zodResolver } from '@hookform/resolvers/zod'
import { useWatch } from 'react-hook-form'
import { DatePickerField } from '@/components/DatePicker'
import { DiscardChangesDialog } from '@/components/DiscardChangesDialog'
import { FormFieldError } from '@/components/FormFieldError'
import { StatusMessage } from '@/components/StatusMessage'
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
import { Textarea } from '@/components/ui/textarea'
import { useTranslation } from '@/contexts/LocaleContext'
import { useFormDialog } from '@/hooks/useFormDialog'
import { useFormDialogClose } from '@/hooks/useFormDialogClose'
import { useValidationSchema } from '@/hooks/useValidationSchema'
import { todayDateOnly } from '@/lib/date-only'
import { formatLocalizedDate } from '@/lib/i18n-format'
import {
  createTaskCompletionSchema,
  type TaskCompletionValues,
} from '@/lib/validations/task'

interface TaskCompleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskTitle: string
  dueDate: string | null
  expectedCost: number
  initialActualEndDate?: string | null
  initialActualCost?: number | null
  initialScheduleReason?: string | null
  initialFinancialReason?: string | null
  taskWeightPercent?: number
  phaseName?: string
  openTaskCount?: number
  onSubmit: (values: TaskCompletionValues) => Promise<void>
  isSubmitting: boolean
}

const COMPLETE_FORM_DEFAULTS: TaskCompletionValues = {
  actual_end_date: todayDateOnly(),
  actual_cost: 0,
  schedule_deviation_reason: '',
  financial_deviation_reason: '',
}

export function TaskCompleteDialog({
  open,
  onOpenChange,
  taskTitle,
  dueDate,
  expectedCost,
  initialActualEndDate,
  initialActualCost,
  initialScheduleReason,
  initialFinancialReason,
  taskWeightPercent,
  phaseName,
  openTaskCount,
  onSubmit,
  isSubmitting,
}: TaskCompleteDialogProps) {
  const { t, locale } = useTranslation()

  const schema = useValidationSchema(
    (translator) =>
      createTaskCompletionSchema(translator, {
        dueDate,
        expectedCost,
      }),
    [dueDate, expectedCost],
  )

  const { form, createSubmitHandler, isDirty } = useFormDialog({
    open,
    resolver: zodResolver(schema),
    defaultValues: COMPLETE_FORM_DEFAULTS,
    getValues: () => ({
      actual_end_date: initialActualEndDate?.trim() || todayDateOnly(),
      actual_cost:
        initialActualCost != null && initialActualCost > 0
          ? Number(initialActualCost)
          : Number(expectedCost) || 0,
      schedule_deviation_reason: initialScheduleReason ?? '',
      financial_deviation_reason: initialFinancialReason ?? '',
    }),
    resetDependencies: [
      expectedCost,
      initialActualCost,
      initialActualEndDate,
      initialFinancialReason,
      initialScheduleReason,
    ],
  })

  const { discardOpen, handleOpenChange, confirmDiscard, cancelDiscard } =
    useFormDialogClose(isDirty, onOpenChange)

  const actualEndDate = useWatch({
    control: form.control,
    name: 'actual_end_date',
  })
  const actualCost = useWatch({ control: form.control, name: 'actual_cost' })

  const scheduleOverrun = Boolean(
    dueDate?.trim() && actualEndDate?.trim() && actualEndDate > dueDate,
  )
  const financialOverrun = Number(actualCost) > Number(expectedCost) + 0.009

  const showImpact =
    taskWeightPercent != null && phaseName != null && openTaskCount != null

  const handleSubmit = createSubmitHandler(onSubmit, () => onOpenChange(false))

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('wbs.markDone')}</DialogTitle>
          <DialogDescription>
            {taskTitle}
            {dueDate ? (
              <>
                {' · '}
                {t('wbs.dueDate')}: {formatLocalizedDate(dueDate, locale)}
              </>
            ) : null}
            {' · '}
            {t('wbs.expectedCost')}: {Number(expectedCost).toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={handleSubmit}
        >
          <DialogBody className="space-y-4">
            {showImpact ? (
              <StatusMessage variant="info">
                {t('wbs.taskCompleteImpact', {
                  weight: taskWeightPercent,
                  phase: phaseName,
                  openTasks: openTaskCount,
                })}
              </StatusMessage>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="complete-actual-end">
                {t('wbs.actualEndDate')}
              </Label>
              <DatePickerField
                id="complete-actual-end"
                control={form.control}
                name="actual_end_date"
              />
              <FormFieldError error={form.formState.errors.actual_end_date} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="complete-actual-cost">
                {t('wbs.actualCost')}
              </Label>
              <Input
                id="complete-actual-cost"
                type="number"
                min="0"
                step="0.01"
                {...form.register('actual_cost', { valueAsNumber: true })}
              />
              <FormFieldError error={form.formState.errors.actual_cost} />
            </div>

            {scheduleOverrun ? (
              <div className="space-y-2">
                <Label htmlFor="complete-schedule-reason">
                  {t('wbs.scheduleDeviationReason')}
                </Label>
                <Textarea
                  id="complete-schedule-reason"
                  rows={3}
                  {...form.register('schedule_deviation_reason')}
                />
                <FormFieldError
                  error={form.formState.errors.schedule_deviation_reason}
                />
              </div>
            ) : null}

            {financialOverrun ? (
              <div className="space-y-2">
                <Label htmlFor="complete-financial-reason">
                  {t('wbs.financialDeviationReason')}
                </Label>
                <Textarea
                  id="complete-financial-reason"
                  rows={3}
                  {...form.register('financial_deviation_reason')}
                />
                <FormFieldError
                  error={form.formState.errors.financial_deviation_reason}
                />
              </div>
            ) : null}
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
              {isSubmitting ? t('common.saving') : t('wbs.markDone')}
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
