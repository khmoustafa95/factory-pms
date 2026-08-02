import { toast } from 'sonner'
import { getQueryErrorMessage } from '@/lib/query-error'
import type { ValidationTranslator } from '@/lib/validations/types'

interface RpcErrorMatcher {
  pattern: RegExp
  key: string
}

/** Maps raw Postgres RAISE EXCEPTION text from transition_project_status to i18n keys. */
const RPC_ERROR_MATCHERS: RpcErrorMatcher[] = [
  {
    pattern: /project wbs is not ready/i,
    key: 'projects.rpcErrors.wbsNotReady',
  },
  {
    pattern: /project duration is required before starting execution/i,
    key: 'projects.rpcErrors.missingDuration',
  },
  {
    pattern: /only the factory manager can start project execution/i,
    key: 'projects.rpcErrors.startNotFactoryManager',
  },
  {
    pattern: /all tasks must be done before marking project completed/i,
    key: 'projects.rpcErrors.tasksNotDone',
  },
  {
    pattern:
      /assigned pm is required before (submitting|resubmitting) proposal/i,
    key: 'projects.pmRequiredToSubmit',
  },
  {
    pattern: /rejection reason must be at least 3 characters/i,
    key: 'validation.rejectionReasonMin',
  },
  {
    pattern: /pause reason must be at least 3 characters/i,
    key: 'validation.pauseReasonMin',
  },
  {
    pattern: /you are not allowed to transition this project/i,
    key: 'projects.rpcErrors.notAllowed',
  },
]

function mapRpcErrorMessage(
  rawMessage: string,
  t: ValidationTranslator,
): string | null {
  const matcher = RPC_ERROR_MATCHERS.find((entry) =>
    entry.pattern.test(rawMessage),
  )
  return matcher ? t(matcher.key) : null
}

export function toastMutationError(
  error: unknown,
  fallbackMessage: string,
  t?: ValidationTranslator,
): void {
  const rawMessage = getQueryErrorMessage(error, fallbackMessage)
  const localizedMessage = t ? mapRpcErrorMessage(rawMessage, t) : null
  toast.error(localizedMessage ?? rawMessage)
}
