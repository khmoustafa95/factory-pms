import { z } from 'zod'
import type { ValidationTranslator } from '@/lib/validations/types'

export function createFactoryFormSchema(t: ValidationTranslator) {
  return z.object({
    name: z.string().trim().min(2, t('validation.nameMin')),
    code: z
      .string()
      .trim()
      .min(2, t('validation.codeMin'))
      .max(12, t('validation.codeMax'))
      .regex(/^[A-Z0-9_-]+$/, t('validation.codeFormat')),
    location: z.string().trim().optional(),
    is_active: z.boolean(),
  })
}

export type FactoryFormValues = z.infer<
  ReturnType<typeof createFactoryFormSchema>
>

export function toFactoryPayload(values: FactoryFormValues) {
  return {
    name: values.name,
    code: values.code.toUpperCase(),
    location: values.location || null,
    is_active: values.is_active,
  }
}
