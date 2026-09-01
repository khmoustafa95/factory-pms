import { z } from 'zod'
import type { ValidationTranslator } from '@/lib/validations/types'

const PROCUREMENT_STATUSES = [
  'planned',
  'ordered',
  'delivered',
  'cancelled',
] as const

export function createProcurementFormSchema(t: ValidationTranslator) {
  return z.object({
    description: z.string().trim().min(1, t('validation.descriptionRequired')),
    quantity: z
      .number({ error: t('validation.quantityPositive') })
      .positive(t('validation.quantityPositive')),
    unit: z.string().trim().min(1, t('validation.unitRequired')),
    estimated_cost: z
      .number({ error: t('validation.budgetNonNegative') })
      .min(0, t('validation.budgetNonNegative')),
    needed_by_date: z.string().trim().optional(),
    supplier: z.string().trim().optional(),
    status: z.enum(PROCUREMENT_STATUSES),
    phase_id: z.string().trim().optional(),
    notes: z.string().trim().optional(),
  })
}

export type ProcurementFormValues = z.infer<
  ReturnType<typeof createProcurementFormSchema>
>

export function toProcurementPayload(values: ProcurementFormValues) {
  return {
    description: values.description.trim(),
    quantity: values.quantity,
    unit: values.unit.trim(),
    estimated_cost: values.estimated_cost,
    needed_by_date: values.needed_by_date?.trim() || null,
    supplier: values.supplier?.trim() || null,
    status: values.status,
    phase_id: values.phase_id?.trim() || null,
    notes: values.notes?.trim() || null,
  }
}
