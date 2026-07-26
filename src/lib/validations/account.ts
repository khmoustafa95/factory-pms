import { z } from 'zod'
import type { ValidationTranslator } from '@/lib/validations/types'
import type { UserRole } from '@/types/database'

export function createAccountFormSchema(t: ValidationTranslator) {
  return z
    .object({
      full_name: z.string().trim().min(2, t('validation.nameMin')),
      role: z.enum(['company_director', 'factory_manager', 'project_manager']),
      factory_id: z.string().uuid().nullable(),
      is_active: z.boolean(),
    })
    .superRefine((values, ctx) => {
      if (values.role !== 'company_director' && !values.factory_id) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.factoryRequired'),
          path: ['factory_id'],
        })
      }

      if (values.role === 'company_director' && values.factory_id) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.directorNoFactory'),
          path: ['factory_id'],
        })
      }
    })
}

export type AccountFormValues = z.infer<
  ReturnType<typeof createAccountFormSchema>
>

export function createAccountDialogSchema(
  t: ValidationTranslator,
  mode: 'create' | 'edit',
) {
  return z
    .object({
      email:
        mode === 'create' ? z.email(t('validation.emailInvalid')) : z.string(),
      full_name: z.string().trim().min(2, t('validation.nameMin')),
      role: z.enum(['company_director', 'factory_manager', 'project_manager']),
      factory_id: z.string().uuid().nullable(),
      is_active: z.boolean(),
    })
    .superRefine((values, ctx) => {
      if (values.role === 'company_director') {
        if (mode === 'create') {
          ctx.addIssue({
            code: 'custom',
            message: t('validation.factoryRequired'),
            path: ['role'],
          })
        }
        return
      }

      if (!values.factory_id) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.factoryRequired'),
          path: ['factory_id'],
        })
      }
    })
}

export type AccountDialogFormValues = {
  email: string
  full_name: string
  role: UserRole
  factory_id: string | null
  is_active: boolean
}

export type AccountCreateFormValues = AccountDialogFormValues

export function createLoginFormSchema(t: ValidationTranslator) {
  return z.object({
    email: z.email(t('validation.emailInvalid')),
    password: z.string().min(6, t('validation.passwordMin')),
  })
}

export type LoginFormValues = z.infer<ReturnType<typeof createLoginFormSchema>>
