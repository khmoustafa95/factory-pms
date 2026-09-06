import { describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { getQueryErrorMessage } from '@/lib/query-error'
import { toastMutationError } from '@/lib/mutation-error'

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}))

describe('toastMutationError', () => {
  it('shows the error message when available', () => {
    toastMutationError(new Error('Save failed'), 'Fallback')

    expect(toast.error).toHaveBeenCalledWith('Save failed')
  })

  it('shows the fallback when the error has no message', () => {
    toastMutationError('oops', 'Fallback')

    expect(toast.error).toHaveBeenCalledWith(
      getQueryErrorMessage('oops', 'Fallback'),
    )
  })

  it('localizes Unauthorized when a translator is provided', () => {
    const t = vi.fn((key: string) =>
      key === 'errors.unauthorized' ? 'غير مصرح' : key,
    )

    toastMutationError(new Error('Unauthorized'), 'Fallback', t)

    expect(t).toHaveBeenCalledWith('errors.unauthorized')
    expect(toast.error).toHaveBeenCalledWith('غير مصرح')
  })

  it('localizes a duplicate project code unique violation', () => {
    const t = vi.fn((key: string) =>
      key === 'validation.projectCodeTaken'
        ? 'هذا الرمز مستخدم مسبقاً في هذا المصنع. اختر رمزاً مختلفاً.'
        : key,
    )

    toastMutationError(
      {
        code: '23505',
        message:
          'duplicate key value violates unique constraint "projects_factory_code_uidx"',
        details: 'Key (factory_id, code)=(abc, PRJ-001) already exists.',
      },
      'Fallback',
      t,
    )

    expect(t).toHaveBeenCalledWith('validation.projectCodeTaken')
    expect(toast.error).toHaveBeenCalledWith(
      'هذا الرمز مستخدم مسبقاً في هذا المصنع. اختر رمزاً مختلفاً.',
    )
  })
})
