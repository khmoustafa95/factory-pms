import { z } from 'zod'
import { getPhaseDurationDays } from '@/lib/duration'
import type { ProjectScheduleBounds } from '@/lib/duration'
import type { ValidationTranslator } from '@/lib/validations/types'

export interface PhaseValidationContext {
  schedule: ProjectScheduleBounds
}

export function createPhaseFormSchema(
  t: ValidationTranslator,
  context?: PhaseValidationContext,
) {
  return z
    .object({
      name: z.string().trim().min(2, t('validation.nameMin')),
      description: z.string().trim().optional(),
      weight_percent: z
        .number({ error: t('validation.weightRequired') })
        .min(0, t('validation.weightMin'))
        .max(100, t('validation.weightMax')),
      start_date: z.string().trim().min(1, t('validation.startDateRequired')),
      end_date: z.string().trim().min(1, t('validation.endDateRequired')),
    })
    .superRefine((values, ctx) => {
      if (values.end_date < values.start_date) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.endAfterStart'),
          path: ['end_date'],
        })
      }

      if (!context) {
        return
      }

      const phaseDays = getPhaseDurationDays(values.start_date, values.end_date)

      if (
        context.schedule.durationDays != null &&
        phaseDays > context.schedule.durationDays
      ) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.phaseExceedsProjectDuration'),
          path: ['end_date'],
        })
      }

      if (context.schedule.hasFixedDates) {
        if (
          context.schedule.start &&
          values.start_date < context.schedule.start
        ) {
          ctx.addIssue({
            code: 'custom',
            message: t('validation.phaseBeforeProjectStart'),
            path: ['start_date'],
          })
        }

        if (context.schedule.end && values.end_date > context.schedule.end) {
          ctx.addIssue({
            code: 'custom',
            message: t('validation.phaseAfterProjectEnd'),
            path: ['end_date'],
          })
        }
      }
    })
}

export type PhaseFormValues = z.infer<ReturnType<typeof createPhaseFormSchema>>

export function toPhasePayload(values: PhaseFormValues) {
  return {
    name: values.name,
    description: values.description?.trim() ? values.description.trim() : null,
    weight_percent: values.weight_percent,
    start_date: values.start_date,
    end_date: values.end_date,
  }
}
