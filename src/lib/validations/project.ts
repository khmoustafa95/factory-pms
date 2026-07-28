import { z } from 'zod'
import { DURATION_UNIT_OPTIONS } from '@/lib/duration'
import type { ValidationTranslator } from '@/lib/validations/types'

export function createProjectFormSchema(t: ValidationTranslator) {
  return z
    .object({
      title: z.string().trim().min(3, t('validation.titleMin')),
      description: z.string().trim().optional(),
      budget: z.string().trim().optional(),
      currency: z.string().trim().min(3).max(3),
      proposed_duration_value: z
        .number({ error: t('validation.durationRequired') })
        .int(t('validation.durationInteger'))
        .min(1, t('validation.durationMin')),
      proposed_duration_unit: z.enum(DURATION_UNIT_OPTIONS),
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
    proposed_duration_value: values.proposed_duration_value,
    proposed_duration_unit: values.proposed_duration_unit,
    proposed_start_date: null,
    proposed_end_date: null,
    assigned_pm_id: values.assigned_pm_id,
  }
}
