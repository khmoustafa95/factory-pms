import { z } from 'zod'

export const factoryFormSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  code: z
    .string()
    .trim()
    .min(2, 'Code must be at least 2 characters')
    .max(12, 'Code must be at most 12 characters')
    .regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase letters, numbers, _ or -'),
  location: z.string().trim().optional(),
  is_active: z.boolean(),
})

export type FactoryFormValues = z.infer<typeof factoryFormSchema>
