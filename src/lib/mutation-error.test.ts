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
})
