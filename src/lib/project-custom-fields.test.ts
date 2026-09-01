import { describe, expect, it } from 'vitest'
import {
  initialFieldValue,
  missingRequiredFields,
  parseSelectOptions,
  validateFieldValue,
} from '@/lib/project-custom-fields'
import type { ProjectFieldDefinition } from '@/types/database'

const definition = (
  overrides: Partial<ProjectFieldDefinition> &
    Pick<ProjectFieldDefinition, 'field_type'>,
): ProjectFieldDefinition => ({
  id: overrides.id ?? 'field-1',
  key: 'site',
  label_en: 'Site',
  label_ar: 'الموقع',
  options: [],
  is_required: false,
  is_active: true,
  sort_order: 0,
  created_at: '',
  updated_at: '',
  ...overrides,
})

const translate = (key: string) => key

describe('project custom fields', () => {
  it('parses select options from lines or commas', () => {
    expect(parseSelectOptions('A\nB, C\n')).toEqual(['A', 'B', 'C'])
  })

  it('defaults booleans to false', () => {
    expect(initialFieldValue(definition({ field_type: 'boolean' }), null)).toBe(
      'false',
    )
  })

  it('validates number, date, and select values', () => {
    expect(
      validateFieldValue(
        definition({ field_type: 'number' }),
        'x',
        translate,
      ),
    ).toBe('validation.numberInvalid')
    expect(
      validateFieldValue(
        definition({ field_type: 'date' }),
        '2026-13-01',
        translate,
      ),
    ).toBe('validation.dateInvalid')
    expect(
      validateFieldValue(
        definition({ field_type: 'select', options: ['east'] }),
        'west',
        translate,
      ),
    ).toBe('validation.selectInvalid')
  })

  it('lists missing required fields', () => {
    const required = definition({
      id: 'req',
      field_type: 'text',
      is_required: true,
    })
    expect(missingRequiredFields([required], { req: '  ' }).map((item) => item.id)).toEqual(
      ['req'],
    )
  })
})
