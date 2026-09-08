import { z } from 'zod'
import { parseDateOnly } from '@/lib/date-only'
import { addDays, format, parseISO } from 'date-fns'
import { durationToDays } from '@/lib/duration'
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

function refineOptionalDurationMonths(
  values: { proposed_duration_months?: string },
  ctx: z.RefinementCtx,
  t: ValidationTranslator,
) {
  const raw = values.proposed_duration_months?.trim() ?? ''
  if (raw.length === 0) {
    return
  }
  if (!/^\d+$/.test(raw)) {
    ctx.addIssue({
      code: 'custom',
      message: t('validation.durationInteger'),
      path: ['proposed_duration_months'],
    })
    return
  }
  const parsed = Number(raw)
  if (parsed < 1) {
    ctx.addIssue({
      code: 'custom',
      message: t('validation.durationMin'),
      path: ['proposed_duration_months'],
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
      proposed_duration_months: z.string().trim().optional().or(z.literal('')),
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

      refineOptionalDurationMonths(values, ctx, t)
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
      proposed_duration_months: z
        .string()
        .trim()
        .min(1, t('validation.durationRequired')),
      ...announcementFields(),
    })
    .superRefine((values, ctx) => {
      const budget = Number(values.budget)
      if (Number.isNaN(budget) || budget <= 0) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.budgetPositive'),
          path: ['budget'],
        })
      }

      if (!/^\d+$/.test(values.proposed_duration_months)) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.durationInteger'),
          path: ['proposed_duration_months'],
        })
      } else if (Number(values.proposed_duration_months) < 1) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.durationMin'),
          path: ['proposed_duration_months'],
        })
      }

      refineAnnouncementDate(values, ctx, t)
    })
}

export function createProjectScheduleSchema(t: ValidationTranslator) {
  return z
    .object({
      proposed_start_date: z
        .string()
        .trim()
        .min(1, t('validation.startDateRequired')),
      proposed_end_date: z
        .string()
        .trim()
        .min(1, t('validation.endDateRequired')),
    })
    .superRefine((values, ctx) => {
      if (!parseDateOnly(values.proposed_start_date)) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.invalidDate'),
          path: ['proposed_start_date'],
        })
      }
      if (!parseDateOnly(values.proposed_end_date)) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.invalidDate'),
          path: ['proposed_end_date'],
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
  proposed_duration_months: string
  announcement_date: string
  announcing_entity: string
  priority: string
  research_opinion: string
  board_opinion: string
}

export type ProjectScheduleFormValues = z.infer<
  ReturnType<typeof createProjectScheduleSchema>
>

export function generateDraftProjectCode(): string {
  const stamp = Date.now().toString(36).toUpperCase()
  return `DRAFT-${stamp}`
}

export function durationMonthsFromProject(project: {
  proposed_duration_value: number | null
  proposed_duration_unit: string | null
  proposed_start_date?: string | null
  proposed_end_date?: string | null
}): string {
  if (
    project.proposed_duration_value != null &&
    project.proposed_duration_unit === 'month'
  ) {
    return String(project.proposed_duration_value)
  }

  if (
    project.proposed_duration_value != null &&
    project.proposed_duration_unit
  ) {
    const days = durationToDays(
      project.proposed_duration_value,
      project.proposed_duration_unit as 'day' | 'week' | 'month',
    )
    return String(Math.max(1, Math.round(days / 30)))
  }

  return ''
}

export function endDateFromStartAndMonths(
  startDate: string,
  months: number,
): string {
  const days = durationToDays(months, 'month')
  return format(addDays(parseISO(startDate), days - 1), 'yyyy-MM-dd')
}

export function toProjectPayload(values: ProjectFormValues) {
  const budget = values.budget?.trim() ? Number(values.budget.trim()) : null
  const durationRaw = values.proposed_duration_months?.trim() ?? ''
  const durationMonths =
    durationRaw.length > 0 && /^\d+$/.test(durationRaw)
      ? Number(durationRaw)
      : null
  const code = values.code.trim().toUpperCase() || generateDraftProjectCode()
  const priority = parseFormPriority(values.priority)

  return {
    code,
    title: values.title.trim() || code,
    description: values.description?.trim() ? values.description.trim() : null,
    budget,
    currency: (values.currency || 'USD').toUpperCase(),
    proposed_duration_value: durationMonths,
    proposed_duration_unit: durationMonths != null ? ('month' as const) : null,
    announcement_date: values.announcement_date.trim() || null,
    announcing_entity: values.announcing_entity.trim() || null,
    priority,
    research_opinion: values.research_opinion.trim() || null,
    board_opinion: values.board_opinion.trim() || null,
  }
}
