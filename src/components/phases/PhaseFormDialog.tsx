import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
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
  schedule: ProjectScheduleBounds
  onSubmit: (values: PhaseFormValues) => Promise<void>
  isSubmitting: boolean
}

const PHASE_FORM_DEFAULTS: PhaseFormValues = {
  name: '',
  description: '',
  weight_percent: 0,
  start_date: '',
  end_date: '',
}

export function PhaseFormDialog({
  open,
  onOpenChange,
  phase,
  remainingWeight,
  schedule,
  onSubmit,
  isSubmitting,
}: PhaseFormDialogProps) {
  const { t, locale } = useTranslation()
  const maxWeight = phase
    ? remainingWeight + Number(phase.weight_percent)
    : remainingWeight

  const phaseFormSchema = useMemo(
    () => createPhaseFormSchema(t, { schedule }),
    [schedule, t],
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
    }),
    resetDependencies: [phase, maxWeight, schedule],
  })

  const handleSubmit = form.handleSubmit(async (values) => {
    if (values.weight_percent > maxWeight + 0.001) {
      form.setError('weight_percent', {
        message: t('validation.weightRemainingMax', {
          remaining: maxWeight.toFixed(1),
        }),
      })
      return
    }

    await onSubmit(values)
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {phase ? t('wbs.editPhase') : t('wbs.newPhase')}
          </DialogTitle>
          <DialogDescription>
            {t('wbs.weightInvalid')}{' '}
            {t('wbs.weightRemaining', {
              remaining: maxWeight.toFixed(1),
            })}
          </DialogDescription>
        </DialogHeader>

        <form key={locale} className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="phase-name">{t('wbs.phaseName')}</Label>
            <Input id="phase-name" {...form.register('name')} />
            <FormFieldError error={form.formState.errors.name} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phase-description">{t('common.description')}</Label>
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
          </div>

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
