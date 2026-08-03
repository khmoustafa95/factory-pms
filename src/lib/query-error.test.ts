import { describe, expect, it } from 'vitest'
import { getQueryErrorMessage } from '@/lib/query-error'

describe('getQueryErrorMessage', () => {
  it('returns the error message when available', () => {
    expect(getQueryErrorMessage(new Error('Network failed'), 'Fallback')).toBe(
      'Network failed',
    )
  })

  it('returns fallback for non-error values', () => {
    expect(getQueryErrorMessage('oops', 'Fallback')).toBe('Fallback')
  })

  it('returns message from plain error-like objects', () => {
    expect(
      getQueryErrorMessage({ message: 'column missing' }, 'Fallback'),
    ).toBe('column missing')
  })
})
