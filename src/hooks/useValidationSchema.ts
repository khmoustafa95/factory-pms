import { useMemo } from 'react'
import { useTranslation } from '@/contexts/LocaleContext'
import type { ValidationTranslator } from '@/lib/validations/types'
import type { z } from 'zod'

export function useValidationSchema<TSchema extends z.ZodType>(
  factory: (t: ValidationTranslator) => TSchema,
): TSchema {
  const { t } = useTranslation()
  return useMemo(() => factory(t), [factory, t])
}
