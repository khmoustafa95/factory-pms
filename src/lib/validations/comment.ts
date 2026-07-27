import { z } from 'zod'
import type { ValidationTranslator } from '@/lib/validations/types'

export function createCommentFormSchema(t: ValidationTranslator) {
  return z.object({
    body: z
      .string()
      .trim()
      .min(1, t('validation.commentRequired'))
      .max(4000, t('validation.commentMaxLength')),
  })
}

export type CommentFormValues = z.infer<
  ReturnType<typeof createCommentFormSchema>
>

export function createEscalationFormSchema(t: ValidationTranslator) {
  return z.object({
    message: z
      .string()
      .trim()
      .min(3, t('validation.escalationMin'))
      .max(2000, t('validation.escalationMaxLength')),
  })
}

export type EscalationFormValues = z.infer<
  ReturnType<typeof createEscalationFormSchema>
>

export const ESCALATION_PREFIX = '[ESCALATION]'

export function formatEscalationBody(message: string): string {
  return `${ESCALATION_PREFIX} ${message.trim()}`
}

export function isEscalationComment(body: string): boolean {
  return body.startsWith(ESCALATION_PREFIX)
}
