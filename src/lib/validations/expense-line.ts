import { z } from 'zod'
import type { ValidationTranslator } from '@/lib/validations/types'

const EXPENSE_CATEGORIES = [
  'materials',
  'labor',
  'equipment',
  'overhead',
  'other',
] as const

export function createExpenseLineFormSchema(t: ValidationTranslator) {
  return z.object({
    category: z.enum(EXPENSE_CATEGORIES),
    description: z.string().trim().min(1, t('validation.descriptionRequired')),
    planned_amount: z
      .number({ error: t('validation.budgetPositive') })
      .positive(t('validation.budgetPositive')),
    actual_amount: z
      .number({ error: t('validation.budgetNonNegative') })
      .min(0, t('validation.budgetNonNegative'))
      .nullable()
      .optional(),
    phase_id: z.string().trim().optional(),
    notes: z.string().trim().optional(),
  })
}

export type ExpenseLineFormValues = z.infer<
  ReturnType<typeof createExpenseLineFormSchema>
>

export function toExpenseLinePayload(values: ExpenseLineFormValues) {
  return {
    category: values.category,
    description: values.description.trim(),
    planned_amount: values.planned_amount,
    actual_amount: values.actual_amount ?? null,
    phase_id: values.phase_id?.trim() || null,
    notes: values.notes?.trim() || null,
  }
}
