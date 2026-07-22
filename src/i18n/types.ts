import { ar } from '@/i18n/locales/ar'
import { en } from '@/i18n/locales/en'

export type Locale = 'en' | 'ar'

export type TranslationDictionary = typeof en

export const LOCALES: { code: Locale; label: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
]

export const translations: Record<Locale, TranslationDictionary> = {
  en,
  ar: ar as unknown as TranslationDictionary,
}

type NestedKeyOf<T, Prefix extends string = ''> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? NestedKeyOf<T[K], `${Prefix}${K}.`>
        : `${Prefix}${K}`
    }[keyof T & string]
  : never

export type TranslationKey = NestedKeyOf<TranslationDictionary>

export type TranslationParams = Record<string, string | number>
