import { z } from 'zod'
import type { ValidationTranslator } from '@/lib/validations/types'

export function createStaffFormSchema(t: ValidationTranslator) {
  return z
    .object({
      full_name: z.string().trim().min(1, t('validation.nameRequired')),
      role_title: z.string().trim().min(1, t('validation.roleTitleRequired')),
      qualifications: z.string().trim().optional(),
      headcount: z
        .number({ error: t('validation.headcountMin') })
        .int()
        .min(1, t('validation.headcountMin')),
      is_contractor: z.boolean(),
      start_date: z.string().trim().optional(),
      end_date: z.string().trim().optional(),
      phase_id: z.string().trim().optional(),
      notes: z.string().trim().optional(),
    })
    .superRefine((values, ctx) => {
      if (
        values.start_date?.trim() &&
        values.end_date?.trim() &&
        values.end_date < values.start_date
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('validation.endDateBeforeStart'),
          path: ['end_date'],
        })
      }
    })
}

export type StaffFormValues = z.infer<
  ReturnType<typeof createStaffFormSchema>
>

export function toStaffPayload(values: StaffFormValues) {
  return {
    full_name: values.full_name.trim(),
    role_title: values.role_title.trim(),
    qualifications: values.qualifications?.trim() || null,
    headcount: values.headcount,
    is_contractor: values.is_contractor,
    start_date: values.start_date?.trim() || null,
    end_date: values.end_date?.trim() || null,
    phase_id: values.phase_id?.trim() || null,
    notes: values.notes?.trim() || null,
  }
}
