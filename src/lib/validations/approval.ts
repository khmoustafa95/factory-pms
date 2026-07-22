import { z } from 'zod'

export const projectRejectSchema = z.object({
  rejection_reason: z
    .string()
    .trim()
    .min(3, 'Rejection reason must be at least 3 characters'),
})

export type ProjectRejectValues = z.infer<typeof projectRejectSchema>
