import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { DatePickerField } from '@/components/DatePicker'
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
import { Textarea } from '@/components/ui/textarea'
import { useTranslation } from '@/contexts/LocaleContext'
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
  onSubmit: (values: TaskCompletionValues) => Promise<void>
  isSubmitting: boolean
}

function todayIsoDate(): string {
  return todayDateOnly()
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
  onSubmit,
  isSubmitting,
}: TaskCompleteDialogProps) {
  const { t, locale } = useTranslation()

  const schema = useMemo(
    () =>
      createTaskCompletionSchema(t, {
        dueDate,
        expectedCost,
      }),
    [dueDate, expectedCost, t],
  )

  const form = useForm<TaskCompletionValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      actual_end_date: todayIsoDate(),
      actual_cost: 0,
      schedule_deviation_reason: '',
      financial_deviation_reason: '',
    },
  })

  useEffect(() => {
    if (!open) {
      return
    }

    form.reset({
      actual_end_date: initialActualEndDate?.trim() || todayIsoDate(),
      actual_cost:
        initialActualCost != null && initialActualCost > 0
          ? Number(initialActualCost)
          : Number(expectedCost) || 0,
      schedule_deviation_reason: initialScheduleReason ?? '',
      financial_deviation_reason: initialFinancialReason ?? '',
    })
  }, [
    expectedCost,
    form,
    initialActualCost,
    initialActualEndDate,
    initialFinancialReason,
    initialScheduleReason,
    open,
  ])

  const actualEndDate = useWatch({
    control: form.control,
    name: 'actual_end_date',
  })
  const actualCost = useWatch({ control: form.control, name: 'actual_cost' })

  const scheduleOverrun = Boolean(
    dueDate?.trim() && actualEndDate?.trim() && actualEndDate > dueDate,
  )
  const financialOverrun = Number(actualCost) > Number(expectedCost) + 0.009

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values)
    onOpenChange(false)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          key={locale}
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={handleSubmit}
        >
          <DialogBody className="space-y-4">
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
              onClick={() => onOpenChange(false)}
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
  )
}
