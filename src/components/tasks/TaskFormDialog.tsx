import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { useWatch } from 'react-hook-form'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useTranslation } from '@/contexts/LocaleContext'
import { useFormDialog } from '@/hooks/useFormDialog'
import { formatLocalizedDate, getTaskStatusLabel } from '@/lib/i18n-format'
import { progressPercentForStatus } from '@/lib/progress'
import { TASK_STATUS_OPTIONS } from '@/lib/task-status'
import {
  createTaskFormSchema,
  type TaskFormValues,
} from '@/lib/validations/task'
import type { Task } from '@/types/database'

interface TaskFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: Task | null
  phaseName: string
  phaseStartDate: string | null
  phaseEndDate: string | null
  remainingWeight: number
  remainingBudget?: number
  onSubmit: (values: TaskFormValues) => Promise<void>
  isSubmitting: boolean
}

const TASK_FORM_DEFAULTS: TaskFormValues = {
  title: '',
  description: '',
  status: 'todo',
  blocked_reason: '',
  due_date: '',
  assignee_id: null,
  weight_percent: 0,
  progress_percent: 0,
  expected_duration_days: 1,
  actual_duration_days: 0,
  expected_cost: 0,
  actual_cost: 0,
  cost_category: 'non_raw_material',
  actual_end_date: '',
  schedule_deviation_reason: '',
  financial_deviation_reason: '',
}

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  phaseName,
  phaseStartDate,
  phaseEndDate,
  remainingWeight,
  remainingBudget,
  onSubmit,
  isSubmitting,
}: TaskFormDialogProps) {
  const { t, locale } = useTranslation()
  const maxWeight = task
    ? remainingWeight + Number(task.weight_percent)
    : remainingWeight
  const maxBudget =
    remainingBudget != null
      ? task
        ? remainingBudget + Number(task.expected_cost)
        : remainingBudget
      : undefined

  const taskFormSchema = useMemo(
    () =>
      createTaskFormSchema(t, {
        phaseStartDate,
        phaseEndDate,
        remainingWeight: maxWeight,
        remainingBudget: maxBudget,
      }),
    [maxBudget, maxWeight, phaseEndDate, phaseStartDate, t],
  )

  const { form } = useFormDialog({
    open,
    resolver: zodResolver(taskFormSchema),
    defaultValues: TASK_FORM_DEFAULTS,
    getValues: () => ({
      title: task?.title ?? '',
      description: task?.description ?? '',
      status: task?.status ?? 'todo',
      blocked_reason: task?.blocked_reason ?? '',
      due_date: task?.due_date ?? '',
      assignee_id: task?.assignee_id ?? null,
      weight_percent: task?.weight_percent ?? Math.min(maxWeight, 100),
      progress_percent:
        task?.progress_percent ??
        progressPercentForStatus(task?.status ?? 'todo'),
      expected_duration_days: task?.expected_duration_days ?? 1,
      actual_duration_days: task?.actual_duration_days ?? 0,
      expected_cost: task?.expected_cost ?? 0,
      actual_cost: task?.actual_cost ?? 0,
      cost_category: task?.cost_category ?? 'non_raw_material',
      actual_end_date: task?.actual_end_date ?? '',
      schedule_deviation_reason: task?.schedule_deviation_reason ?? '',
      financial_deviation_reason: task?.financial_deviation_reason ?? '',
    }),
    resetDependencies: [task, maxWeight],
  })

  const selectedStatus = useWatch({ control: form.control, name: 'status' })
  const watchedActualEndDate = useWatch({
    control: form.control,
    name: 'actual_end_date',
  })
  const watchedActualCost = useWatch({
    control: form.control,
    name: 'actual_cost',
  })
  const watchedDueDate = useWatch({ control: form.control, name: 'due_date' })
  const watchedExpectedCost = useWatch({
    control: form.control,
    name: 'expected_cost',
  })

  const showCompletionFields = selectedStatus === 'done'
  const progressEditable =
    selectedStatus === 'in_progress' || selectedStatus === 'blocked'
  const scheduleOverrun = Boolean(
    watchedDueDate?.trim() &&
    watchedActualEndDate?.trim() &&
    watchedActualEndDate > watchedDueDate,
  )
  const financialOverrun =
    Number(watchedActualCost) > Number(watchedExpectedCost) + 0.009

  const handleSubmit = form.handleSubmit(async (values) => {
    const payload: TaskFormValues = task
      ? values.status === 'done'
        ? values
        : {
            ...values,
            expected_duration_days: task.expected_duration_days,
            actual_duration_days: task.actual_duration_days,
            actual_cost: task.actual_cost,
            cost_category: task.cost_category,
            actual_end_date: task.actual_end_date ?? '',
            schedule_deviation_reason: task.schedule_deviation_reason ?? '',
            financial_deviation_reason: task.financial_deviation_reason ?? '',
          }
      : {
          ...values,
          status: 'todo',
          blocked_reason: '',
          assignee_id: null,
          progress_percent: 0,
          expected_duration_days: 1,
          actual_duration_days: 0,
          actual_cost: 0,
          cost_category: 'non_raw_material',
          actual_end_date: '',
          schedule_deviation_reason: '',
          financial_deviation_reason: '',
        }

    await onSubmit(payload)
    onOpenChange(false)
  })

  const phaseRangeHint =
    phaseStartDate && phaseEndDate
      ? `${formatLocalizedDate(phaseStartDate, locale)} → ${formatLocalizedDate(phaseEndDate, locale)}`
      : t('wbs.noPhaseSchedule')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {task ? t('wbs.editTask') : t('wbs.newTask')}
          </DialogTitle>
          <DialogDescription>
            {t('common.phase')}: {phaseName} ·{' '}
            {t('wbs.taskWeightRemaining', {
              remaining: maxWeight.toFixed(1),
            })}
          </DialogDescription>
        </DialogHeader>

        <form
          key={locale}
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={handleSubmit}
        >
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">{t('wbs.taskTitle')}</Label>
              <Input id="task-title" {...form.register('title')} />
              <FormFieldError error={form.formState.errors.title} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-description">
                {t('wbs.taskDescription')}
              </Label>
              <Textarea
                id="task-description"
                rows={3}
                {...form.register('description')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-due-date">{t('wbs.taskDueDate')}</Label>
              <DatePickerField
                id="task-due-date"
                control={form.control}
                name="due_date"
                min={phaseStartDate ?? undefined}
                max={phaseEndDate ?? undefined}
                allowClear
              />
              <FormFieldError error={form.formState.errors.due_date} />
              <p className="text-xs text-muted-foreground">
                {t('wbs.taskDueDateHint', { range: phaseRangeHint })}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="task-weight">{t('wbs.taskWeight')}</Label>
                <Input
                  id="task-weight"
                  type="number"
                  min="0"
                  max={maxWeight}
                  step="0.1"
                  {...form.register('weight_percent', { valueAsNumber: true })}
                />
                <FormFieldError error={form.formState.errors.weight_percent} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-expected-cost">
                  {t('wbs.expectedCost')}
                </Label>
                <Input
                  id="task-expected-cost"
                  type="number"
                  min="0"
                  max={maxBudget}
                  step="0.01"
                  {...form.register('expected_cost', { valueAsNumber: true })}
                />
                <FormFieldError error={form.formState.errors.expected_cost} />
                {maxBudget != null ? (
                  <p className="text-xs text-muted-foreground">
                    {t('wbs.budgetRemaining', {
                      remaining: maxBudget.toFixed(2),
                    })}
                  </p>
                ) : null}
              </div>
            </div>

            {task ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('wbs.taskStatus')}</Label>
                    <Select
                      value={selectedStatus}
                      onValueChange={(value) => {
                        if (
                          value === 'todo' ||
                          value === 'in_progress' ||
                          value === 'blocked' ||
                          value === 'done'
                        ) {
                          form.setValue('status', value)
                          form.setValue(
                            'progress_percent',
                            progressPercentForStatus(
                              value,
                              form.getValues('progress_percent'),
                            ),
                          )
                          if (value === 'done') {
                            if (!form.getValues('actual_end_date')?.trim()) {
                              form.setValue(
                                'actual_end_date',
                                new Date().toISOString().slice(0, 10),
                              )
                            }
                            if (form.getValues('actual_duration_days') <= 0) {
                              form.setValue('actual_duration_days', 1)
                            }
                            if (
                              !form.getValues('actual_cost') &&
                              form.getValues('expected_cost') > 0
                            ) {
                              form.setValue(
                                'actual_cost',
                                form.getValues('expected_cost'),
                              )
                            }
                          }
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status} value={status}>
                            {getTaskStatusLabel(t, status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {progressEditable ? (
                    <div className="space-y-2">
                      <Label htmlFor="task-progress">
                        {t('wbs.taskProgress')}
                      </Label>
                      <Input
                        id="task-progress"
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        {...form.register('progress_percent', {
                          valueAsNumber: true,
                        })}
                      />
                      <FormFieldError
                        error={form.formState.errors.progress_percent}
                      />
                    </div>
                  ) : null}
                </div>

                {selectedStatus === 'blocked' ? (
                  <div className="space-y-2">
                    <Label htmlFor="task-blocked-reason">
                      {t('wbs.blockedReasonLabel')}
                    </Label>
                    <Textarea
                      id="task-blocked-reason"
                      rows={3}
                      {...form.register('blocked_reason')}
                    />
                    <FormFieldError
                      error={form.formState.errors.blocked_reason}
                    />
                  </div>
                ) : null}

                {showCompletionFields ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="task-actual-end">
                          {t('wbs.actualEndDate')}
                        </Label>
                        <DatePickerField
                          id="task-actual-end"
                          control={form.control}
                          name="actual_end_date"
                          allowClear
                        />
                        <FormFieldError
                          error={form.formState.errors.actual_end_date}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="task-actual-cost">
                          {t('wbs.actualCost')}
                        </Label>
                        <Input
                          id="task-actual-cost"
                          type="number"
                          min="0"
                          step="0.01"
                          {...form.register('actual_cost', {
                            valueAsNumber: true,
                          })}
                        />
                        <FormFieldError
                          error={form.formState.errors.actual_cost}
                        />
                      </div>
                    </div>

                    {scheduleOverrun ? (
                      <div className="space-y-2">
                        <Label htmlFor="task-schedule-reason">
                          {t('wbs.scheduleDeviationReason')}
                        </Label>
                        <Textarea
                          id="task-schedule-reason"
                          rows={2}
                          {...form.register('schedule_deviation_reason')}
                        />
                        <FormFieldError
                          error={
                            form.formState.errors.schedule_deviation_reason
                          }
                        />
                      </div>
                    ) : null}

                    {financialOverrun ? (
                      <div className="space-y-2">
                        <Label htmlFor="task-financial-reason">
                          {t('wbs.financialDeviationReason')}
                        </Label>
                        <Textarea
                          id="task-financial-reason"
                          rows={2}
                          {...form.register('financial_deviation_reason')}
                        />
                        <FormFieldError
                          error={
                            form.formState.errors.financial_deviation_reason
                          }
                        />
                      </div>
                    ) : null}
                  </>
                ) : null}
              </>
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
              {isSubmitting
                ? t('common.saving')
                : task
                  ? t('common.save')
                  : t('common.addTask')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
