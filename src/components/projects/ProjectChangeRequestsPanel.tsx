import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useTranslation } from '@/contexts/LocaleContext'
import { formatLocalizedBudget, formatLocalizedDate } from '@/lib/i18n-format'
import { toastMutationError } from '@/lib/mutation-error'
import type { ProjectChangeRequest } from '@/types/database'

interface ProjectChangeRequestsPanelProps {
  requests: ProjectChangeRequest[]
  currency: string
  canReview: boolean
  onReview: (
    requestId: string,
    approve: boolean,
    reason?: string,
  ) => Promise<void>
  isReviewing: boolean
}

export function ProjectChangeRequestsPanel({
  requests,
  currency,
  canReview,
  onReview,
  isReviewing,
}: ProjectChangeRequestsPanelProps) {
  const { t, locale } = useTranslation()
  const pending = requests.filter((item) => item.status === 'pending')
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  if (pending.length === 0) {
    return null
  }

  const handleApprove = async (requestId: string) => {
    try {
      await onReview(requestId, true)
      toast.success(t('projects.changeRequest.approved'))
    } catch (error) {
      toastMutationError(error, t('projects.changeRequest.reviewFailed'), t)
    }
  }

  const handleReject = async () => {
    if (!rejectId || rejectReason.trim().length < 3) {
      return
    }

    try {
      await onReview(rejectId, false, rejectReason.trim())
      toast.success(t('projects.changeRequest.rejected'))
      setRejectId(null)
      setRejectReason('')
    } catch (error) {
      toastMutationError(error, t('projects.changeRequest.reviewFailed'), t)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('projects.changeRequest.pendingTitle')}</CardTitle>
          <CardDescription>
            {t('projects.changeRequest.pendingDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.map((request) => (
            <div key={request.id} className="app-panel space-y-2 p-3 text-sm">
              <p className="font-medium">
                {t(`projects.changeRequest.kinds.${request.change_kind}`)}
              </p>
              <p className="text-muted-foreground">{request.reason}</p>
              {request.change_kind === 'budget' ? (
                <p>
                  {formatLocalizedBudget(
                    request.current_budget,
                    currency,
                    locale,
                    '—',
                  )}{' '}
                  →{' '}
                  {formatLocalizedBudget(
                    request.requested_budget,
                    currency,
                    locale,
                    '—',
                  )}
                </p>
              ) : (
                <p>
                  {formatLocalizedDate(request.current_start_date, locale)} →{' '}
                  {formatLocalizedDate(request.requested_start_date, locale)}
                  {' / '}
                  {formatLocalizedDate(request.current_end_date, locale)} →{' '}
                  {formatLocalizedDate(request.requested_end_date, locale)}
                </p>
              )}
              {canReview ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={isReviewing}
                    onClick={() => void handleApprove(request.id)}
                  >
                    {t('common.approve')}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={isReviewing}
                    onClick={() => {
                      setRejectId(request.id)
                      setRejectReason('')
                    }}
                  >
                    {t('common.reject')}
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog
        open={rejectId != null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectId(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('projects.changeRequest.rejectTitle')}</DialogTitle>
            <DialogDescription>
              {t('projects.changeRequest.rejectDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Textarea
              rows={3}
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
            />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejectId(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isReviewing || rejectReason.trim().length < 3}
              onClick={() => void handleReject()}
            >
              {t('common.reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
