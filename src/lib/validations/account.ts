import { z } from 'zod'

export const accountFormSchema = z
  .object({
    full_name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    role: z.enum(['company_director', 'factory_manager', 'project_manager']),
    factory_id: z.string().uuid().nullable(),
    is_active: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.role !== 'company_director' && !values.factory_id) {
      ctx.addIssue({
        code: 'custom',
        message: 'Factory is required for this role',
        path: ['factory_id'],
      })
    }

    if (values.role === 'company_director' && values.factory_id) {
      ctx.addIssue({
        code: 'custom',
        message: 'Company directors are not assigned to a factory',
        path: ['factory_id'],
      })
    }
  })

export type AccountFormValues = z.infer<typeof accountFormSchema>

export const loginFormSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export type LoginFormValues = z.infer<typeof loginFormSchema>
