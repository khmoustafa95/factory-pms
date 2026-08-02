import { z } from 'zod'
import { progressPercentForStatus } from '@/lib/progress'
import type { ValidationTranslator } from '@/lib/validations/types'

export interface TaskValidationContext {
  phaseStartDate: string | null
  phaseEndDate: string | null
  remainingWeight: number
  remainingBudget?: number
}

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
    actual_duration_days: values.actual_duration_days,
    expected_cost: values.expected_cost,
    actual_cost: values.actual_cost,
    cost_category: values.cost_category,
  }
}
