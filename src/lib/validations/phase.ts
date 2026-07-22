import { z } from 'zod'

export const phaseFormSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  description: z.string().trim().optional(),
  weight_percent: z
    .number({ error: 'Weight is required' })
    .min(0, 'Weight must be at least 0')
    .max(100, 'Weight cannot exceed 100'),
  status: z.enum(['pending', 'in_progress', 'completed']),
})

export type PhaseFormValues = z.infer<typeof phaseFormSchema>
