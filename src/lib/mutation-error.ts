import { toast } from 'sonner'
import { getQueryErrorMessage } from '@/lib/query-error'
import type { ValidationTranslator } from '@/lib/validations/types'

interface ErrorMatcher {
  pattern: RegExp
  key: string
}

function readErrorField(error: object, field: string): string {
  if (!(field in error)) {
    return ''
  }

  const value = (error as Record<string, unknown>)[field]
  return typeof value === 'string' ? value : ''
}

function getErrorSearchText(error: unknown): string {
  if (typeof error === 'string') {
    return error
  }

  if (typeof error !== 'object' || error === null) {
    return ''
  }

  return [
    readErrorField(error, 'message'),
    readErrorField(error, 'details'),
    readErrorField(error, 'hint'),
    readErrorField(error, 'code'),
  ]
    .filter((part) => part.length > 0)
    .join(' ')
}

/** Maps Postgres unique / check constraint failures to i18n keys. */
const DB_CONSTRAINT_MATCHERS: ErrorMatcher[] = [
  {
    pattern: /projects_factory_code_uidx|\(factory_id,\s*code\)/i,
    key: 'validation.projectCodeTaken',
  },
  {
    pattern: /factories_code_key/i,
    key: 'factories.import.codeTaken',
  },
]

/** Maps raw Postgres RAISE EXCEPTION text from transition_project_status to i18n keys. */
const RPC_ERROR_MATCHERS: ErrorMatcher[] = [
  {
    pattern: /view-only account/i,
    key: 'common.viewOnly',
  },
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
    pattern: /project duration is required before submitting proposal/i,
    key: 'validation.durationRequired',
  },
  {
    pattern: /project schedule is required before starting execution/i,
    key: 'projects.executionNotReady.missing_project_schedule',
  },
  {
    pattern: /project schedule is required before adding phases/i,
    key: 'projects.executionNotReady.missing_project_schedule',
  },
  {
    pattern: /assigned pm is required before starting execution/i,
    key: 'projects.executionNotReady.missing_assigned_pm',
  },
  {
    pattern:
      /assigned pm is required before (submitting|resubmitting) proposal/i,
    key: 'validation.assignedPmRequired',
  },
  {
    pattern: /research opinion is required before completing consultation/i,
    key: 'validation.researchOpinionMin',
  },
  {
    pattern: /board opinion is required before completing consultation/i,
    key: 'validation.boardOpinionMin',
  },
  {
    pattern: /only company director can complete consultation/i,
    key: 'projects.rpcErrors.completeConsultationNotDirector',
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
      /cannot assign pm unless the project is approved, in progress, or paused/i,
    key: 'projects.rpcErrors.reassignWrongStatus',
  },
  {
    pattern: /assigned pm must be an active project manager in this factory/i,
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
  {
    pattern: /tasks stay in planning until execution starts/i,
    key: 'projects.rpcErrors.tasksPlanningOnly',
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

export function matchMutationErrorKey(error: unknown): string | null {
  const searchText = getErrorSearchText(error)
  if (!searchText) {
    return null
  }

  const matcher = [
    ...DB_CONSTRAINT_MATCHERS,
    ...API_ERROR_MATCHERS,
    ...RPC_ERROR_MATCHERS,
  ].find((entry) => entry.pattern.test(searchText))

  return matcher?.key ?? null
}

export function toastMutationError(
  error: unknown,
  fallbackMessage: string,
  t?: ValidationTranslator,
): void {
  const rawMessage = getQueryErrorMessage(error, fallbackMessage)
  const mappedKey = t ? matchMutationErrorKey(error) : null
  toast.error(mappedKey && t ? t(mappedKey) : rawMessage)
}
