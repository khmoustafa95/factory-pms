import { describe, expect, it } from 'vitest'
import {
  formatNullableSelectValue,
  NULL_SELECT_VALUE,
  parseNullableSelectValue,
} from '@/lib/form-utils'

describe('nullable select helpers', () => {
  it('formats nullish values to the shared sentinel', () => {
    expect(formatNullableSelectValue(null)).toBe(NULL_SELECT_VALUE)
    expect(formatNullableSelectValue(undefined)).toBe(NULL_SELECT_VALUE)
    expect(formatNullableSelectValue('user-1')).toBe('user-1')
  })

  it('parses the sentinel back to null', () => {
    expect(parseNullableSelectValue(NULL_SELECT_VALUE)).toBeNull()
    expect(parseNullableSelectValue('user-1')).toBe('user-1')
  })
})
