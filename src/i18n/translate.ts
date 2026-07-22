import type { TranslationDictionary, TranslationParams } from '@/i18n/types'
import type { ar } from '@/i18n/locales/ar'

type TranslatorDictionary = TranslationDictionary | typeof ar

function getNestedValue(
  dictionary: TranslatorDictionary,
  key: string,
): string | undefined {
  const parts = key.split('.')
  let current: unknown = dictionary

  for (const part of parts) {
    if (current === null || typeof current !== 'object' || !(part in current)) {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }

  return typeof current === 'string' ? current : undefined
}

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) {
    return template
  }

  return template.replace(/\{\{(\w+)\}\}/g, (_, token: string) => {
    const value = params[token]
    return value === undefined ? `{{${token}}}` : String(value)
  })
}

export function createTranslator(dictionary: TranslatorDictionary) {
  return (key: string, params?: TranslationParams): string => {
    const value = getNestedValue(dictionary, key)
    if (value === undefined) {
      return key
    }
    return interpolate(value, params)
  }
}
