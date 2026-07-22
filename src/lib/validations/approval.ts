import { z } from 'zod'
import type { ValidationTranslator } from '@/lib/validations/types'

export function createProjectRejectSchema(t: ValidationTranslator) {
  return z.object({
    rejection_reason: z
      .string()
      .trim()
      .min(3, t('validation.rejectionReasonMin')),
  })
}

export type ProjectRejectValues = z.infer<
  ReturnType<typeof createProjectRejectSchema>
>
