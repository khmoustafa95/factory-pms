import { z } from 'zod'

export const commentFormSchema = z.object({
  body: z.string().trim().min(1, 'Comment cannot be empty'),
})

export type CommentFormValues = z.infer<typeof commentFormSchema>

export const escalationFormSchema = z.object({
  message: z
    .string()
    .trim()
    .min(3, 'Escalation message must be at least 3 characters'),
})

export type EscalationFormValues = z.infer<typeof escalationFormSchema>

export const ESCALATION_PREFIX = '[ESCALATION]'

export function formatEscalationBody(message: string): string {
  return `${ESCALATION_PREFIX} ${message.trim()}`
}

export function isEscalationComment(body: string): boolean {
  return body.startsWith(ESCALATION_PREFIX)
}
