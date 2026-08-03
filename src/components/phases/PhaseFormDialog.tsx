import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { useWatch } from 'react-hook-form'
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
import { useFormDialog } from '@/hooks/useFormDialog'
import type { ProjectScheduleBounds } from '@/lib/duration'
import { formatLocalizedDate, getPhaseStatusLabel } from '@/lib/i18n-format'
import {
  createPhaseFormSchema,
  type PhaseFormValues,
} from '@/lib/validations/phase'
import type { Phase } from '@/types/database'

interface PhaseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  phase?: Phase | null
  remainingWeight: number
  remainingBudget: number
  projectBudget: number | null | undefined
  schedule: ProjectScheduleBounds
  actualCostTotal?: number
  scheduleDeviationDays?: number | null
  onSubmit: (values: PhaseFormValues) => Promise<void>
  isSubmitting: boolean
}

const PHASE_FORM_DEFAULTS: PhaseFormValues = {
  name: '',
  description: '',
  weight_percent: 0,
  start_date: '',
  end_date: '',
  expected_budget: 0,
  actual_budget: null,
  actual_end_date: '',
  schedule_deviation_reason: '',
  financial_deviation_reason: '',
  problem_description: '',
  solution_in_progress: '',
}

export function PhaseFormDialog({
  open,
  onOpenChange,
  phase,
  remainingWeight,
  remainingBudget,
  projectBudget,
  schedule,
  actualCostTotal = 0,
  scheduleDeviationDays = null,
  onSubmit,
  isSubmitting,
}: PhaseFormDialogProps) {
  const { t, locale } = useTranslation()
  const maxWeight = phase
    ? remainingWeight + Number(phase.weight_percent)
    : remainingWeight
  const maxBudget = phase
    ? remainingBudget + Number(phase.expected_budget)
    : remainingBudget

  const phaseFormSchema = useMemo(
    () =>
      createPhaseFormSchema(t, {
        schedule,
        actualCostTotal,
        scheduleDeviationDays,
        remainingBudget: maxBudget,
      }),
    [actualCostTotal, maxBudget, schedule, scheduleDeviationDays, t],
  )

  const { form } = useFormDialog({
    open,
    resolver: zodResolver(phaseFormSchema),
    defaultValues: PHASE_FORM_DEFAULTS,
    getValues: () => ({
      name: phase?.name ?? '',
      description: phase?.description ?? '',
      weight_percent: phase?.weight_percent ?? Math.min(maxWeight, 0),
      start_date: phase?.start_date ?? schedule.start ?? '',
      end_date: phase?.end_date ?? schedule.end ?? '',
      expected_budget: phase?.expected_budget ?? 0,
      actual_budget: phase?.actual_budget ?? null,
      actual_end_date: phase?.actual_end_date ?? '',
      schedule_deviation_reason: phase?.schedule_deviation_reason ?? '',
      financial_deviation_reason: phase?.financial_deviation_reason ?? '',
      problem_description: phase?.problem_description ?? '',
      solution_in_progress: phase?.solution_in_progress ?? '',
    }),
    resetDependencies: [
      phase,
      maxWeight,
      maxBudget,
      schedule,
      actualCostTotal,
      scheduleDeviationDays,
    ],
  })

  const watchedActualEndDate = useWatch({
    control: form.control,
    name: 'actual_end_date',
  })
  const showActualBudget =
    phase?.status === 'completed' || Boolean(watchedActualEndDate?.trim())

  const handleSubmit = form.handleSubmit(async (values) => {
    if (values.weight_percent > maxWeight + 0.001) {
      form.setError('weight_percent', {
        message: t('validation.weightRemainingMax', {
          remaining: maxWeight.toFixed(1),
        }),
      })
      return
    }

    const payload: PhaseFormValues = phase
      ? values
      : {
          ...values,
          actual_budget: null,
          actual_end_date: '',
          schedule_deviation_reason: '',
          financial_deviation_reason: '',
          problem_description: '',
          solution_in_progress: '',
        }

    await onSubmit(payload)
    onOpenChange(false)
  })

  const scheduleHint =
    schedule.start && schedule.end
      ? `${formatLocalizedDate(schedule.start, locale)} → ${formatLocalizedDate(schedule.end, locale)}`
      : schedule.durationDays != null
        ? t('wbs.projectDurationDays', { days: schedule.durationDays })
        : t('wbs.noProjectSchedule')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {phase ? t('wbs.editPhase') : t('wbs.newPhase')}
          </DialogTitle>
          <DialogDescription>
            {t('wbs.weightRemaining', { remaining: maxWeight.toFixed(1) })}
            {' · '}
            {t('wbs.budgetRemaining', { remaining: maxBudget.toFixed(2) })}
          </DialogDescription>
        </DialogHeader>

        <form
          key={locale}
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={handleSubmit}
        >
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phase-name">{t('wbs.phaseName')}</Label>
              <Input id="phase-name" {...form.register('name')} />
              <FormFieldError error={form.formState.errors.name} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phase-description">
                {t('common.description')}
              </Label>
              <Textarea
                id="phase-description"
                rows={3}
                {...form.register('description')}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phase-weight">{t('wbs.phaseWeight')}</Label>
                <Input
                  id="phase-weight"
                  type="number"
                  min="0"
                  max={maxWeight}
                  step="0.1"
                  {...form.register('weight_percent', { valueAsNumber: true })}
                />
                <FormFieldError error={form.formState.errors.weight_percent} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phase-expected-budget">
                  {t('wbs.expectedBudget')}
                </Label>
                <Input
                  id="phase-expected-budget"
                  type="number"
                  min="0"
                  max={maxBudget}
                  step="0.01"
                  {...form.register('expected_budget', { valueAsNumber: true })}
                />
                <FormFieldError error={form.formState.errors.expected_budget} />
                {projectBudget != null ? (
                  <p className="text-xs text-muted-foreground">
                    {t('common.budget')}: {Number(projectBudget).toFixed(2)}
                  </p>
                ) : null}
              </div>
            </div>

            {phase ? (
              <div className="space-y-2">
                <Label>{t('wbs.phaseStatus')}</Label>
                <p className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">
                  {getPhaseStatusLabel(t, phase.status)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('wbs.phaseStatusHint')}
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {t('wbs.phaseScheduleHint', { range: scheduleHint })}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phase-start">{t('wbs.startDate')}</Label>
                <Input
                  id="phase-start"
                  type="date"
                  min={schedule.start ?? undefined}
                  max={schedule.end ?? undefined}
                  {...form.register('start_date')}
                />
                <FormFieldError error={form.formState.errors.start_date} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phase-end">{t('wbs.endDate')}</Label>
                <Input
                  id="phase-end"
                  type="date"
                  min={schedule.start ?? undefined}
                  max={schedule.end ?? undefined}
                  {...form.register('end_date')}
                />
                <FormFieldError error={form.formState.errors.end_date} />
              </div>
            </div>

            {/* Field tracking: only when editing an existing phase */}
            {phase ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phase-actual-end">
                    {t('wbs.actualEndDate')}
                  </Label>
                  <Input
                    id="phase-actual-end"
                    type="date"
                    {...form.register('actual_end_date')}
                  />
                  <FormFieldError
                    error={form.formState.errors.actual_end_date}
                  />
                </div>

                {showActualBudget ? (
                  <div className="space-y-2">
                    <Label htmlFor="phase-actual-budget">
                      {t('wbs.actualBudget')}
                    </Label>
                    <Input
                      id="phase-actual-budget"
                      type="number"
                      min="0"
                      step="0.01"
                      {...form.register('actual_budget', {
                        setValueAs: (value) =>
                          value === '' || value === null ? null : Number(value),
                      })}
                    />
                    <FormFieldError
                      error={form.formState.errors.actual_budget}
                    />
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="phase-schedule-reason">
                    {t('wbs.scheduleDeviationReason')}
                  </Label>
                  <Textarea
                    id="phase-schedule-reason"
                    rows={2}
                    {...form.register('schedule_deviation_reason')}
                  />
                  <FormFieldError
                    error={form.formState.errors.schedule_deviation_reason}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phase-financial-reason">
                    {t('wbs.financialDeviationReason')}
                  </Label>
                  <Textarea
                    id="phase-financial-reason"
                    rows={2}
                    {...form.register('financial_deviation_reason')}
                  />
                  <FormFieldError
                    error={form.formState.errors.financial_deviation_reason}
                  />
                  {actualCostTotal > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {t('wbs.actualCostHint', {
                        amount: actualCostTotal.toFixed(2),
                      })}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phase-problem">
                    {t('wbs.problemDescription')}
                  </Label>
                  <Textarea
                    id="phase-problem"
                    rows={2}
                    {...form.register('problem_description')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phase-solution">
                    {t('wbs.solutionInProgress')}
                  </Label>
                  <Textarea
                    id="phase-solution"
                    rows={2}
                    {...form.register('solution_in_progress')}
                  />
                </div>
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
                : phase
                  ? t('common.save')
                  : t('common.addPhase')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
