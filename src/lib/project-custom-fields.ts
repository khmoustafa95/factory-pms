import { parseDateOnly } from '@/lib/date-only'
import type { Locale } from '@/i18n/types'
import type { ValidationTranslator } from '@/lib/validations/types'
import type { ProjectFieldDefinition, ProjectFieldType } from '@/types/database'

export const PROJECT_FIELD_TYPES: ProjectFieldType[] = [
  'text',
  'number',
  'date',
  'boolean',
  'select',
]

export function fieldDefinitionLabel(
  definition: Pick<ProjectFieldDefinition, 'label_en' | 'label_ar'>,
  locale: Locale,
): string {
  return locale === 'ar' ? definition.label_ar : definition.label_en
}

export function parseSelectOptions(raw: string): string[] {
  return raw
    .split(/\r?\n|,/)
    .map((option) => option.trim())
    .filter((option) => option.length > 0)
}

export function initialFieldValue(
  definition: ProjectFieldDefinition,
  stored: string | null | undefined,
): string {
  if (stored != null && stored !== '') {
    return stored
  }
  if (definition.field_type === 'boolean') {
    return 'false'
  }
  return ''
}

export function isFieldValueMissing(
  definition: ProjectFieldDefinition,
  value: string,
): boolean {
  if (definition.field_type === 'boolean') {
    return value !== 'true' && value !== 'false'
  }
  return value.trim() === ''
}

export function validateFieldValue(
  definition: ProjectFieldDefinition,
  value: string,
  t: ValidationTranslator,
): string | null {
  if (isFieldValueMissing(definition, value)) {
    return definition.is_required ? t('validation.required') : null
  }

  const trimmed = value.trim()

  if (definition.field_type === 'number') {
    const parsed = Number(trimmed)
    if (!Number.isFinite(parsed)) {
      return t('validation.numberInvalid')
    }
  }

  if (definition.field_type === 'date' && !parseDateOnly(trimmed)) {
    return t('validation.dateInvalid')
  }

  if (
    definition.field_type === 'select' &&
    !definition.options.includes(trimmed)
  ) {
    return t('validation.selectInvalid')
  }

  return null
}

export function missingRequiredFields(
  definitions: ProjectFieldDefinition[],
  values: Record<string, string>,
): ProjectFieldDefinition[] {
  return definitions.filter(
    (definition) =>
      definition.is_required &&
      isFieldValueMissing(definition, values[definition.id] ?? ''),
  )
}
