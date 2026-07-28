import { z } from 'zod'
import type { ValidationTranslator } from '@/lib/validations/types'

export interface TaskValidationContext {
  phaseStartDate: string | null
  phaseEndDate: string | null
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
  }
}
