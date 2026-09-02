import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StatusMessage } from '@/components/StatusMessage'
import { useTranslation } from '@/contexts/LocaleContext'

interface ProjectCompleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'request' | 'confirm'
  projectTitle: string
  allTasksDone: boolean
  blockedCount: number
  overdueCount: number
  openProcurementCount: number
  onConfirm: () => Promise<void>
  isSubmitting: boolean
}

export function ProjectCompleteDialog({
  open,
  onOpenChange,
  mode,
  projectTitle,
  allTasksDone,
  blockedCount,
  overdueCount,
  openProcurementCount,
  onConfirm,
  isSubmitting,
}: ProjectCompleteDialogProps) {
  const { t } = useTranslation()
  const canClose = allTasksDone && blockedCount === 0

  const handleConfirm = async () => {
    await onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'confirm'
              ? t('projects.completeDialog.confirmTitle')
              : t('projects.completeDialog.requestTitle')}
          </DialogTitle>
          <DialogDescription>
            {mode === 'confirm'
              ? t('projects.completeDialog.confirmDescription', {
                  title: projectTitle,
                })
              : t('projects.completeDialog.requestDescription', {
                  title: projectTitle,
                })}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-3 text-sm">
          <ul className="app-panel space-y-2 p-3">
            <li>
              {allTasksDone
                ? t('projects.completeDialog.tasksDone')
                : t('projects.completeDialog.tasksOpen')}
            </li>
            <li>
              {t('projects.completeDialog.blocked', { count: blockedCount })}
            </li>
            <li>
              {t('projects.completeDialog.overdue', { count: overdueCount })}
            </li>
            <li>
              {t('projects.completeDialog.openProcurement', {
                count: openProcurementCount,
              })}
            </li>
          </ul>

          {!canClose ? (
            <StatusMessage variant="error">
              {t('projects.completeDialog.blockedClose')}
            </StatusMessage>
          ) : null}

          {canClose && openProcurementCount > 0 ? (
            <StatusMessage variant="warning">
              {t('projects.completeDialog.procurementWarning')}
            </StatusMessage>
          ) : null}
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            disabled={isSubmitting || !canClose}
            onClick={() => void handleConfirm()}
          >
            <Check className="size-4" />
            {isSubmitting
              ? t('common.submitting')
              : mode === 'confirm'
                ? t('common.completeExecution')
                : t('projects.completeDialog.requestAction')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
