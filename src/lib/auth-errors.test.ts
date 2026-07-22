import { describe, expect, it } from 'vitest'
import { AuthError, isAuthError } from '@/lib/auth-errors'

describe('AuthError', () => {
  it('identifies inactive account errors', () => {
    const error = new AuthError('INACTIVE_ACCOUNT')

    expect(isAuthError(error)).toBe(true)
    expect(error.code).toBe('INACTIVE_ACCOUNT')
  })

  it('rejects generic errors', () => {
    expect(isAuthError(new Error('nope'))).toBe(false)
  })
})
