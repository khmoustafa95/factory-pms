import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useTranslation } from '@/contexts/LocaleContext'
import { getPhaseStatusLabel } from '@/lib/i18n-format'
import { useValidationSchema } from '@/hooks/useValidationSchema'
import {
  createPhaseFormSchema,
  type PhaseFormValues,
} from '@/lib/validations/phase'
import type { Phase, PhaseStatus } from '@/types/database'

const PHASE_STATUS_OPTIONS = [
  'pending',
  'in_progress',
  'completed',
] as const satisfies readonly PhaseStatus[]

interface PhaseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  phase?: Phase | null
  remainingWeight: number
  onSubmit: (values: PhaseFormValues) => Promise<void>
  isSubmitting: boolean
}

export function PhaseFormDialog({
  open,
  onOpenChange,
  phase,
  remainingWeight,
  onSubmit,
  isSubmitting,
}: PhaseFormDialogProps) {
  const { t, locale } = useTranslation()
  const phaseFormSchema = useValidationSchema(createPhaseFormSchema)

  const form = useForm<PhaseFormValues>({
    resolver: zodResolver(phaseFormSchema),
    defaultValues: {
      name: '',
      description: '',
      weight_percent: 0,
      status: 'pending',
    },
  })

  const selectedStatus = useWatch({ control: form.control, name: 'status' })
  const maxWeight = phase
    ? remainingWeight + Number(phase.weight_percent)
    : remainingWeight

  useEffect(() => {
    if (!open) {
      return
    }

    form.reset({
      name: phase?.name ?? '',
      description: phase?.description ?? '',
      weight_percent: phase?.weight_percent ?? Math.min(maxWeight, 0),
      status: phase?.status ?? 'pending',
    })
  }, [form, maxWeight, open, phase])

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

            <div className="space-y-2">
              <Label>{t('wbs.phaseStatus')}</Label>
              <Select
                value={selectedStatus}
                onValueChange={(value) => {
                  if (
                    value === 'pending' ||
                    value === 'in_progress' ||
                    value === 'completed'
                  ) {
                    form.setValue('status', value)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PHASE_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {getPhaseStatusLabel(t, status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
