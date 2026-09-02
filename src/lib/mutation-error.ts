import { toast } from 'sonner'
import { getQueryErrorMessage } from '@/lib/query-error'
import type { ValidationTranslator } from '@/lib/validations/types'

interface ErrorMatcher {
  pattern: RegExp
  key: string
}

/** Maps raw Postgres RAISE EXCEPTION text from transition_project_status to i18n keys. */
const RPC_ERROR_MATCHERS: ErrorMatcher[] = [
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
  {
    pattern: /only factory manager or company director can pause execution/i,
    key: 'projects.rpcErrors.pauseNotGovernor',
  },
  {
    pattern: /only factory manager or company director can resume execution/i,
    key: 'projects.rpcErrors.resumeNotGovernor',
  },
  {
    pattern: /only company director can complete project execution/i,
    key: 'projects.rpcErrors.completeNotDirector',
  },
  {
    pattern: /only the factory manager can request project completion/i,
    key: 'projects.rpcErrors.requestCompleteNotFactoryManager',
  },
  {
    pattern: /project must be in progress or paused to request completion/i,
    key: 'projects.rpcErrors.requestCompleteWrongStatus',
  },
  {
    pattern: /approved project contract fields are frozen/i,
    key: 'projects.rpcErrors.contractFrozen',
  },
  {
    pattern: /assigned pm must be changed through reassign_project_pm/i,
    key: 'projects.rpcErrors.pmReassignRpc',
  },
  {
    pattern: /completion requests must go through request_project_completion/i,
    key: 'projects.rpcErrors.completionRequestRpc',
  },
  {
    pattern: /change requests are only allowed after approval/i,
    key: 'projects.rpcErrors.changeBeforeApproval',
  },
  {
    pattern: /you are not allowed to request a project change/i,
    key: 'projects.rpcErrors.changeNotAllowed',
  },
  {
    pattern: /change request reason must be at least 3 characters/i,
    key: 'validation.changeReasonMin',
  },
  {
    pattern: /a pending change request of this kind already exists/i,
    key: 'projects.rpcErrors.changePendingExists',
  },
  {
    pattern: /only company director can review change requests/i,
    key: 'projects.rpcErrors.changeReviewNotDirector',
  },
  {
    pattern: /change request is not pending/i,
    key: 'projects.rpcErrors.changeNotPending',
  },
  {
    pattern: /only the factory manager can reassign the project manager/i,
    key: 'projects.rpcErrors.reassignNotFactoryManager',
  },
  {
    pattern: /cannot reassign pm on a completed project/i,
    key: 'projects.rpcErrors.reassignCompleted',
  },
  {
    pattern:
      /assigned pm must be an active project manager in this factory/i,
    key: 'projects.rpcErrors.reassignInvalidPm',
  },
  {
    pattern: /reassignment reason must be at least 3 characters/i,
    key: 'validation.reassignReasonMin',
  },
  {
    pattern: /you are not allowed to acknowledge this escalation/i,
    key: 'projects.rpcErrors.acknowledgeNotAllowed',
  },
  {
    pattern: /only blocked tasks can be acknowledged/i,
    key: 'projects.rpcErrors.acknowledgeNotBlocked',
  },
]

/** Maps Edge Function / auth / account API errors to i18n keys. */
const API_ERROR_MATCHERS: ErrorMatcher[] = [
  {
    pattern: /^unauthorized$/i,
    key: 'errors.unauthorized',
  },
  {
    pattern: /invalid jwt|invalid or expired session|jwt expired/i,
    key: 'errors.sessionExpired',
  },
  {
    pattern: /missing authorization/i,
    key: 'errors.sessionExpired',
  },
  {
    pattern: /^forbidden$/i,
    key: 'errors.forbidden',
  },
  {
    pattern: /not allowed to create this account/i,
    key: 'accounts.errors.createForbidden',
  },
  {
    pattern: /not allowed to reset this account/i,
    key: 'accounts.errors.resetForbidden',
  },
  {
    pattern: /profile not found/i,
    key: 'errors.profileNotFound',
  },
  {
    pattern: /your account is inactive/i,
    key: 'errors.accountInactive',
  },
  {
    pattern: /already (been )?registered|user already exists|email.*exists/i,
    key: 'accounts.errors.emailTaken',
  },
  {
    pattern: /failed to send.*(edge function|request)|functions?relayerror/i,
    key: 'errors.edgeFunctionUnavailable',
  },
  {
    pattern: /edge function returned a non-2xx/i,
    key: 'errors.edgeFunctionFailed',
  },
  {
    pattern: /server misconfigured/i,
    key: 'errors.serverMisconfigured',
  },
  {
    pattern: /missing required fields/i,
    key: 'errors.missingFields',
  },
  {
    pattern: /unexpected response/i,
    key: 'errors.unexpectedResponse',
  },
  {
    pattern: /request failed/i,
    key: 'errors.requestFailed',
  },
]

function mapKnownErrorMessage(
  rawMessage: string,
  t: ValidationTranslator,
): string | null {
  const matchers = [...API_ERROR_MATCHERS, ...RPC_ERROR_MATCHERS]
  const matcher = matchers.find((entry) => entry.pattern.test(rawMessage))
  return matcher ? t(matcher.key) : null
}

export function toastMutationError(
  error: unknown,
  fallbackMessage: string,
  t?: ValidationTranslator,
): void {
  const rawMessage = getQueryErrorMessage(error, fallbackMessage)
  const localizedMessage = t ? mapKnownErrorMessage(rawMessage, t) : null
  toast.error(localizedMessage ?? rawMessage)
}
