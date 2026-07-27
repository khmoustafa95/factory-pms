import { z } from 'zod'
import type { ValidationTranslator } from '@/lib/validations/types'

const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024
const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

export function createAppSettingsFormSchema(t: ValidationTranslator) {
  return z.object({
    app_name_en: z.string().trim().min(2, t('validation.appNameMin')),
    app_name_ar: z.string().trim().min(2, t('validation.appNameMin')),
    app_short_name_en: z
      .string()
      .trim()
      .min(1, t('validation.appShortNameMin')),
    app_short_name_ar: z
      .string()
      .trim()
      .min(1, t('validation.appShortNameMin')),
    sign_in_description_en: z
      .string()
      .trim()
      .min(5, t('validation.signInDescriptionMin')),
    sign_in_description_ar: z
      .string()
      .trim()
      .min(5, t('validation.signInDescriptionMin')),
    logo_url: z.string().nullable().optional(),
    logo_file: z
      .instanceof(File)
      .refine((file) => file.size <= MAX_LOGO_SIZE_BYTES, {
        message: t('validation.logoMaxSize'),
      })
      .refine(
        (file) =>
          ALLOWED_LOGO_TYPES.includes(
            file.type as (typeof ALLOWED_LOGO_TYPES)[number],
          ),
        { message: t('validation.logoType') },
      )
      .optional(),
  })
}

export type AppSettingsFormValues = z.infer<
  ReturnType<typeof createAppSettingsFormSchema>
>

export { ALLOWED_LOGO_TYPES, MAX_LOGO_SIZE_BYTES }
