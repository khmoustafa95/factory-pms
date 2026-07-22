import { z } from 'zod'
import type { ValidationTranslator } from '@/lib/validations/types'

export function createPhaseFormSchema(t: ValidationTranslator) {
  return z.object({
    name: z.string().trim().min(2, t('validation.nameMin')),
    description: z.string().trim().optional(),
    weight_percent: z
      .number({ error: t('validation.weightRequired') })
      .min(0, t('validation.weightMin'))
      .max(100, t('validation.weightMax')),
    status: z.enum(['pending', 'in_progress', 'completed']),
  })
}

export type PhaseFormValues = z.infer<ReturnType<typeof createPhaseFormSchema>>

export function toPhasePayload(values: PhaseFormValues) {
  return {
    name: values.name,
    description: values.description?.trim() ? values.description.trim() : null,
    weight_percent: values.weight_percent,
    status: values.status,
  }
}
