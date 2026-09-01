import { useMemo } from 'react'
import { useTranslation } from '@/contexts/LocaleContext'
import type { ValidationTranslator } from '@/lib/validations/types'
import type { z } from 'zod'

export function useValidationSchema<TSchema extends z.ZodType>(
  factory: (t: ValidationTranslator) => TSchema,
  deps: readonly unknown[] = [],
): TSchema {
  const { t } = useTranslation()
  // Inline schema factories change every render; callers pass stable extra deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo -- factory omitted on purpose
  return useMemo(() => factory(t), [t, ...deps])
}
