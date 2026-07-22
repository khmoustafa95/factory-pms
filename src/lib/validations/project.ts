import { z } from 'zod'
import type { ValidationTranslator } from '@/lib/validations/types'

export function createProjectFormSchema(t: ValidationTranslator) {
  return z
    .object({
      title: z.string().trim().min(3, t('validation.titleMin')),
      description: z.string().trim().optional(),
      budget: z.string().trim().optional(),
      currency: z.string().trim().min(3).max(3),
      proposed_start_date: z.string().trim().optional(),
      proposed_end_date: z.string().trim().optional(),
      assigned_pm_id: z.string().uuid().nullable(),
    })
    .superRefine((values, ctx) => {
      if (values.budget) {
        const parsed = Number(values.budget)
        if (Number.isNaN(parsed) || parsed <= 0) {
          ctx.addIssue({
            code: 'custom',
            message: t('validation.budgetPositive'),
            path: ['budget'],
          })
        }
      }

      if (values.proposed_start_date && values.proposed_end_date) {
        if (values.proposed_end_date < values.proposed_start_date) {
          ctx.addIssue({
            code: 'custom',
            message: t('validation.endAfterStart'),
            path: ['proposed_end_date'],
          })
        }
      }
    })
}

export type ProjectFormValues = z.infer<
  ReturnType<typeof createProjectFormSchema>
>

export function toProjectPayload(values: ProjectFormValues) {
  const budget = values.budget?.trim() ? Number(values.budget.trim()) : null

  return {
    title: values.title,
    description: values.description?.trim() ? values.description.trim() : null,
    budget,
    currency: values.currency.toUpperCase(),
    proposed_start_date: values.proposed_start_date?.trim()
      ? values.proposed_start_date.trim()
      : null,
    proposed_end_date: values.proposed_end_date?.trim()
      ? values.proposed_end_date.trim()
      : null,
    assigned_pm_id: values.assigned_pm_id,
  }
}
