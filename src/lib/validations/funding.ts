import { z } from 'zod'
import type { ValidationTranslator } from '@/lib/validations/types'

const FUNDING_SOURCE_TYPES = [
  'internal',
  'loan',
  'grant',
  'partner',
  'other',
] as const

const FUNDING_ENTRY_STATUSES = ['planned', 'received', 'cancelled'] as const

export function createFundingFormSchema(t: ValidationTranslator) {
  return z
    .object({
      source_type: z.enum(FUNDING_SOURCE_TYPES),
      source_name: z.string().trim().optional(),
      amount: z
        .number({ error: t('validation.budgetPositive') })
        .positive(t('validation.budgetPositive')),
      expected_date: z.string().trim().optional(),
      received_date: z.string().trim().optional(),
      status: z.enum(FUNDING_ENTRY_STATUSES),
      notes: z.string().trim().optional(),
    })
    .superRefine((values, ctx) => {
      if (values.status === 'received' && !values.received_date?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('validation.fundingReceivedDateRequired'),
          path: ['received_date'],
        })
      }

      if (
        values.source_type === 'other' &&
        !values.source_name?.trim()
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('validation.fundingSourceNameRequired'),
          path: ['source_name'],
        })
      }
    })
}

export type FundingFormValues = z.infer<
  ReturnType<typeof createFundingFormSchema>
>

export function toFundingPayload(values: FundingFormValues) {
  return {
    source_type: values.source_type,
    source_name: values.source_name?.trim() || null,
    amount: values.amount,
    expected_date: values.expected_date?.trim() || null,
    received_date: values.received_date?.trim() || null,
    status: values.status,
    notes: values.notes?.trim() || null,
  }
}
