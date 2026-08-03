import { z } from 'zod'
import { progressPercentForStatus } from '@/lib/progress'
import type { ValidationTranslator } from '@/lib/validations/types'

export interface TaskValidationContext {
  phaseStartDate: string | null
  phaseEndDate: string | null
  remainingWeight: number
  remainingBudget?: number
}

export interface TaskCompletionContext {
  dueDate: string | null | undefined
  expectedCost: number
}

function refineTaskCompletionOverruns(
  values: {
    actual_end_date?: string
    actual_cost: number
    schedule_deviation_reason?: string
    financial_deviation_reason?: string
  },
  ctx: z.RefinementCtx,
  t: ValidationTranslator,
  context?: TaskCompletionContext,
) {
  const dueDate = context?.dueDate?.trim()
  const actualEnd = values.actual_end_date?.trim()
  if (dueDate && actualEnd && actualEnd > dueDate) {
    if (!values.schedule_deviation_reason?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: t('validation.scheduleDeviationReasonRequired'),
        path: ['schedule_deviation_reason'],
      })
    }
  }

  const expectedCost = context?.expectedCost ?? 0
  if (values.actual_cost > expectedCost + 0.009) {
    if (!values.financial_deviation_reason?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: t('validation.financialDeviationReasonRequired'),
        path: ['financial_deviation_reason'],
      })
    }
  }
}

export function createTaskCompletionSchema(
  t: ValidationTranslator,
  context?: TaskCompletionContext,
) {
  return z
    .object({
      actual_end_date: z
        .string()
        .trim()
        .min(1, t('validation.actualEndDateRequired')),
      actual_cost: z
        .number({ error: t('validation.actualCostRequired') })
        .min(0, t('validation.budgetNonNegative')),
      schedule_deviation_reason: z.string().trim().optional(),
      financial_deviation_reason: z.string().trim().optional(),
    })
    .superRefine((values, ctx) => {
      refineTaskCompletionOverruns(values, ctx, t, context)
    })
}

export type TaskCompletionValues = z.infer<
  ReturnType<typeof createTaskCompletionSchema>
>

export function createTaskFormSchema(
  t: ValidationTranslator,
  context?: TaskValidationContext,
) {
  return z
    .object({
      title: z.string().trim().min(2, t('validation.titleMinShort')),
      description: z.string().trim().optional(),
      status: z.enum(['todo', 'in_progress', 'blocked', 'done']),
      blocked_reason: z.string().trim().optional(),
      due_date: z.string().trim().optional(),
      assignee_id: z.string().uuid().nullable(),
      weight_percent: z
        .number({ error: t('validation.weightRequired') })
        .min(0, t('validation.weightMin'))
        .max(100, t('validation.weightMax')),
      progress_percent: z
        .number({ error: t('validation.progressRequired') })
        .min(0, t('validation.progressMin'))
        .max(100, t('validation.progressMax')),
      expected_duration_days: z
        .number({ error: t('validation.durationRequired') })
        .int(t('validation.durationInteger'))
        .min(0, t('validation.durationNonNegative')),
      actual_duration_days: z
        .number({ error: t('validation.durationRequired') })
        .int(t('validation.durationInteger'))
        .min(0, t('validation.durationNonNegative')),
      expected_cost: z
        .number({ error: t('validation.expectedBudgetRequired') })
        .min(0, t('validation.budgetNonNegative')),
      actual_cost: z
        .number({ error: t('validation.actualCostRequired') })
        .min(0, t('validation.budgetNonNegative')),
      cost_category: z.enum(['raw_material', 'non_raw_material']),
      actual_end_date: z.string().trim().optional(),
      schedule_deviation_reason: z.string().trim().optional(),
      financial_deviation_reason: z.string().trim().optional(),
    })
    .superRefine((values, ctx) => {
      if (values.status === 'blocked') {
        if (!values.blocked_reason?.trim()) {
          ctx.addIssue({
            code: 'custom',
            message: t('validation.blockedReasonRequired'),
            path: ['blocked_reason'],
          })
        }
      }

      if (values.status !== 'blocked' && values.blocked_reason?.trim()) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.clearBlockedReason'),
          path: ['blocked_reason'],
        })
      }

      if (values.status === 'done') {
        if (!values.actual_end_date?.trim()) {
          ctx.addIssue({
            code: 'custom',
            message: t('validation.actualEndDateRequired'),
            path: ['actual_end_date'],
          })
        }

        refineTaskCompletionOverruns(values, ctx, t, {
          dueDate: values.due_date,
          expectedCost: values.expected_cost,
        })
      }

      if (context && values.weight_percent > context.remainingWeight + 0.001) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.weightRemainingMax', {
            remaining: context.remainingWeight.toFixed(1),
          }),
          path: ['weight_percent'],
        })
      }

      if (
        context?.remainingBudget != null &&
        values.expected_cost > context.remainingBudget + 0.001
      ) {
        ctx.addIssue({
          code: 'custom',
          message: t('wbs.expectedBudgetRemaining', {
            remaining: context.remainingBudget.toFixed(2),
          }),
          path: ['expected_cost'],
        })
      }

      if (!values.due_date?.trim() || !context) {
        return
      }

      if (context.phaseStartDate && values.due_date < context.phaseStartDate) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.taskBeforePhaseStart'),
          path: ['due_date'],
        })
      }

      if (context.phaseEndDate && values.due_date > context.phaseEndDate) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.taskAfterPhaseEnd'),
          path: ['due_date'],
        })
      }
    })
}

export type TaskFormValues = z.infer<ReturnType<typeof createTaskFormSchema>>

export function toTaskPayload(values: TaskFormValues) {
  const progressPercent =
    values.status === 'done' || values.status === 'todo'
      ? progressPercentForStatus(values.status)
      : values.progress_percent

  const isDone = values.status === 'done'

  return {
    title: values.title,
    description: values.description?.trim() ? values.description.trim() : null,
    status: values.status,
    blocked_reason:
      values.status === 'blocked'
        ? (values.blocked_reason?.trim() ?? null)
        : null,
    due_date: values.due_date?.trim() ? values.due_date.trim() : null,
    assignee_id: values.assignee_id,
    weight_percent: values.weight_percent,
    progress_percent: progressPercent,
    expected_duration_days: values.expected_duration_days,
    actual_duration_days: isDone
      ? Math.max(values.actual_duration_days, 1)
      : values.actual_duration_days,
    expected_cost: values.expected_cost,
    actual_cost: values.actual_cost,
    cost_category: values.cost_category,
    actual_end_date: isDone
      ? (values.actual_end_date?.trim() ?? null)
      : values.actual_end_date?.trim()
        ? values.actual_end_date.trim()
        : null,
    schedule_deviation_reason: isDone
      ? values.schedule_deviation_reason?.trim() || null
      : null,
    financial_deviation_reason: isDone
      ? values.financial_deviation_reason?.trim() || null
      : null,
  }
}
