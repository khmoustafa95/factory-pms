import { z } from 'zod'
import { getPhaseDurationDays } from '@/lib/duration'
import type { ValidationTranslator } from '@/lib/validations/types'

const codeSchema = (t: ValidationTranslator) =>
  z
    .string()
    .trim()
    .min(2, t('validation.codeMin'))
    .max(32, t('validation.projectCodeMax'))
    .regex(/^[A-Z0-9_-]+$/, t('validation.codeFormat'))

export function createDraftProjectSchema(t: ValidationTranslator) {
  return z
    .object({
      code: z.string().trim().optional().or(z.literal('')),
      title: z.string().trim().optional().or(z.literal('')),
      description: z.string().trim().optional().or(z.literal('')),
      budget: z.string().trim().optional().or(z.literal('')),
      currency: z.string().trim().min(3).max(3).default('USD'),
      proposed_start_date: z.string().trim().optional().or(z.literal('')),
      proposed_end_date: z.string().trim().optional().or(z.literal('')),
      assigned_pm_id: z.string().uuid().nullable(),
    })
    .superRefine((values, ctx) => {
      if (values.code && values.code.length > 0) {
        const parsed = codeSchema(t).safeParse(values.code.toUpperCase())
        if (!parsed.success) {
          for (const issue of parsed.error.issues) {
            ctx.addIssue({
              code: 'custom',
              message: issue.message,
              path: ['code'],
            })
          }
        }
      }

      if (values.title && values.title.length > 0 && values.title.length < 3) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.titleMin'),
          path: ['title'],
        })
      }

      if (values.budget) {
        const parsed = Number(values.budget)
        if (Number.isNaN(parsed) || parsed <= 0) {
          ctx.addIssue({
            code: 'custom',
            message: t('validation.budgetPositive'),
            path: ['budget'],
          })
        }
      }

      if (
        values.proposed_start_date &&
        values.proposed_end_date &&
        values.proposed_end_date < values.proposed_start_date
      ) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.endAfterStart'),
          path: ['proposed_end_date'],
        })
      }
    })
}

export function createSubmitProjectSchema(t: ValidationTranslator) {
  return z
    .object({
      code: codeSchema(t),
      title: z.string().trim().min(3, t('validation.titleMin')),
      description: z.string().trim().min(3, t('validation.descriptionMin')),
      budget: z.string().trim().min(1, t('validation.budgetRequired')),
      currency: z.string().trim().min(3).max(3),
      proposed_start_date: z
        .string()
        .trim()
        .min(1, t('validation.startDateRequired')),
      proposed_end_date: z
        .string()
        .trim()
        .min(1, t('validation.endDateRequired')),
      assigned_pm_id: z.string().uuid(t('validation.assignedPmRequired')),
    })
    .superRefine((values, ctx) => {
      const parsed = Number(values.budget)
      if (Number.isNaN(parsed) || parsed <= 0) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.budgetPositive'),
          path: ['budget'],
        })
      }

      if (values.proposed_end_date < values.proposed_start_date) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.endAfterStart'),
          path: ['proposed_end_date'],
        })
      }
    })
}

export type ProjectFormValues = {
  code: string
  title: string
  description: string
  budget: string
  currency: string
  proposed_start_date: string
  proposed_end_date: string
  assigned_pm_id: string | null
}

export function generateDraftProjectCode(): string {
  const stamp = Date.now().toString(36).toUpperCase()
  return `DRAFT-${stamp}`
}

export function toProjectPayload(values: ProjectFormValues) {
  const budget = values.budget?.trim() ? Number(values.budget.trim()) : null
  const start = values.proposed_start_date?.trim() || null
  const end = values.proposed_end_date?.trim() || null
  const durationDays = start && end ? getPhaseDurationDays(start, end) : null
  const code = values.code.trim().toUpperCase() || generateDraftProjectCode()

  return {
    code,
    title: values.title.trim() || code,
    description: values.description?.trim() ? values.description.trim() : null,
    budget,
    currency: (values.currency || 'USD').toUpperCase(),
    proposed_start_date: start,
    proposed_end_date: end,
    proposed_duration_value: durationDays,
    proposed_duration_unit: durationDays != null ? ('day' as const) : null,
    assigned_pm_id: values.assigned_pm_id,
  }
}
