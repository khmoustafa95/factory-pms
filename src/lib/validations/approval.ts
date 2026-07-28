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

export function createProjectPauseSchema(t: ValidationTranslator) {
  return z.object({
    pause_reason: z.string().trim().min(3, t('validation.pauseReasonMin')),
  })
}

export type ProjectRejectValues = z.infer<
  ReturnType<typeof createProjectRejectSchema>
>

export type ProjectPauseValues = z.infer<
  ReturnType<typeof createProjectPauseSchema>
>
