import { z } from 'zod'
import type { ValidationTranslator } from '@/lib/validations/types'

export function createChangeRequestSchema(t: ValidationTranslator) {
  return z
    .object({
      change_kind: z.enum(['budget', 'schedule']),
      reason: z.string().trim().min(3, t('validation.changeReasonMin')),
      requested_budget: z.string().trim().optional().or(z.literal('')),
      requested_start_date: z.string().trim().optional().or(z.literal('')),
      requested_end_date: z.string().trim().optional().or(z.literal('')),
    })
    .superRefine((values, ctx) => {
      if (values.change_kind === 'budget') {
        const parsed = Number(values.requested_budget)
        if (!values.requested_budget || Number.isNaN(parsed) || parsed <= 0) {
          ctx.addIssue({
            code: 'custom',
            message: t('validation.budgetPositive'),
            path: ['requested_budget'],
          })
        }
      }

      if (values.change_kind === 'schedule') {
        if (!values.requested_start_date) {
          ctx.addIssue({
            code: 'custom',
            message: t('validation.startDateRequired'),
            path: ['requested_start_date'],
          })
        }
        if (!values.requested_end_date) {
          ctx.addIssue({
            code: 'custom',
            message: t('validation.endDateRequired'),
            path: ['requested_end_date'],
          })
        }
        if (
          values.requested_start_date &&
          values.requested_end_date &&
          values.requested_end_date < values.requested_start_date
        ) {
          ctx.addIssue({
            code: 'custom',
            message: t('validation.endAfterStart'),
            path: ['requested_end_date'],
          })
        }
      }
    })
}

export function createReassignPmSchema(t: ValidationTranslator) {
  return z.object({
    assigned_pm_id: z.string().uuid(t('validation.assignedPmRequired')),
    reason: z.string().trim().min(3, t('validation.reassignReasonMin')),
  })
}

export function createChangeReviewSchema(t: ValidationTranslator) {
  return z.object({
    review_reason: z.string().trim().min(3, t('validation.rejectionReasonMin')),
  })
}

export type ChangeRequestFormValues = z.infer<
  ReturnType<typeof createChangeRequestSchema>
>
export type ReassignPmFormValues = z.infer<
  ReturnType<typeof createReassignPmSchema>
>
export type ChangeReviewFormValues = z.infer<
  ReturnType<typeof createChangeReviewSchema>
>
