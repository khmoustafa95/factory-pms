import { toast } from 'sonner'
import { getQueryErrorMessage } from '@/lib/query-error'

export function toastMutationError(
  error: unknown,
  fallbackMessage: string,
): void {
  toast.error(getQueryErrorMessage(error, fallbackMessage))
}
