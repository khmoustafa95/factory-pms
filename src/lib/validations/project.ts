import { z } from 'zod'
import { parseDateOnly } from '@/lib/date-only'
import { getPhaseDurationDays } from '@/lib/duration'
import type { ProjectPriority } from '@/types/database'
import type { ValidationTranslator } from '@/lib/validations/types'

export const PROJECT_PRIORITIES: ProjectPriority[] = ['high', 'medium', 'low']

function parseFormPriority(value: string): ProjectPriority | null {
  for (const priority of PROJECT_PRIORITIES) {
    if (priority === value) {
      return priority
    }
  }
  return null
}

const codeSchema = (t: ValidationTranslator) =>
  z
    .string()
    .trim()
    .min(2, t('validation.codeMin'))
    .max(32, t('validation.projectCodeMax'))
    .regex(/^[A-Z0-9_-]+$/, t('validation.codeFormat'))

const announcementFields = () => ({
  announcement_date: z.string().trim(),
  announcing_entity: z.string().trim(),
  priority: z.string(),
  research_opinion: z.string().trim(),
  board_opinion: z.string().trim(),
})

function refineAnnouncementDate(
  values: { announcement_date?: string },
  ctx: z.RefinementCtx,
  t: ValidationTranslator,
) {
  const raw = values.announcement_date?.trim() ?? ''
  if (raw.length === 0) {
    return
  }
  if (!parseDateOnly(raw)) {
    ctx.addIssue({
      code: 'custom',
      message: t('validation.invalidDate'),
      path: ['announcement_date'],
    })
  }
}

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
      ...announcementFields(),
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

      refineAnnouncementDate(values, ctx, t)
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
      ...announcementFields(),
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

      refineAnnouncementDate(values, ctx, t)
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
  announcement_date: string
  announcing_entity: string
  priority: string
  research_opinion: string
  board_opinion: string
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
  const priority = parseFormPriority(values.priority)

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
    announcement_date: values.announcement_date.trim() || null,
    announcing_entity: values.announcing_entity.trim() || null,
    priority,
    research_opinion: values.research_opinion.trim() || null,
    board_opinion: values.board_opinion.trim() || null,
  }
}
