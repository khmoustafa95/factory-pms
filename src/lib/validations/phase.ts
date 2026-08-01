import { differenceInCalendarDays, parseISO } from 'date-fns'
import { z } from 'zod'
import { getPhaseDurationDays } from '@/lib/duration'
import type { ProjectScheduleBounds } from '@/lib/duration'
import type { ValidationTranslator } from '@/lib/validations/types'

export interface PhaseValidationContext {
  schedule: ProjectScheduleBounds
  actualCostTotal?: number
  scheduleDeviationDays?: number | null
}

function calendarDayDelta(fromDate: string, toDate: string): number {
  return differenceInCalendarDays(parseISO(toDate), parseISO(fromDate))
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
      expected_budget: z
        .number({ error: t('validation.expectedBudgetRequired') })
        .min(0, t('validation.budgetNonNegative')),
      actual_end_date: z.string().trim().optional(),
      schedule_deviation_reason: z.string().trim().optional(),
      financial_deviation_reason: z.string().trim().optional(),
      problem_description: z.string().trim().optional(),
      solution_in_progress: z.string().trim().optional(),
    })
    .superRefine((values, ctx) => {
      if (values.end_date < values.start_date) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.endAfterStart'),
          path: ['end_date'],
        })
      }

      if (
        values.actual_end_date &&
        values.actual_end_date < values.start_date
      ) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.actualEndAfterStart'),
          path: ['actual_end_date'],
        })
      }

      const resolvedScheduleDeviation =
        context?.scheduleDeviationDays !== undefined
          ? context.scheduleDeviationDays
          : values.actual_end_date
            ? calendarDayDelta(values.end_date, values.actual_end_date)
            : null

      if (
        resolvedScheduleDeviation != null &&
        Math.abs(resolvedScheduleDeviation) > 0 &&
        !values.schedule_deviation_reason?.trim()
      ) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.scheduleDeviationReasonRequired'),
          path: ['schedule_deviation_reason'],
        })
      }

      const actualCost = context?.actualCostTotal ?? 0
      const financialDev = actualCost - values.expected_budget
      if (
        actualCost > 0 &&
        Math.abs(financialDev) > 0.009 &&
        !values.financial_deviation_reason?.trim()
      ) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.financialDeviationReasonRequired'),
          path: ['financial_deviation_reason'],
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
    expected_budget: values.expected_budget,
    actual_end_date: values.actual_end_date?.trim()
      ? values.actual_end_date.trim()
      : null,
    schedule_deviation_reason: values.schedule_deviation_reason?.trim()
      ? values.schedule_deviation_reason.trim()
      : null,
    financial_deviation_reason: values.financial_deviation_reason?.trim()
      ? values.financial_deviation_reason.trim()
      : null,
    problem_description: values.problem_description?.trim()
      ? values.problem_description.trim()
      : null,
    solution_in_progress: values.solution_in_progress?.trim()
      ? values.solution_in_progress.trim()
      : null,
  }
}
