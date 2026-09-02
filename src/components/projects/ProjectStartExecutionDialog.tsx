import { Play } from 'lucide-react'
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
import { formatLocalizedBudget } from '@/lib/i18n-format'
import type { ExecutionReadinessReason } from '@/lib/wbs'
import type { Project } from '@/types/database'

interface ProjectStartExecutionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project
  pmName: string
  fundingReceived: number
  readinessReasons: ExecutionReadinessReason[]
  onConfirm: () => Promise<void>
  isSubmitting: boolean
}

export function ProjectStartExecutionDialog({
  open,
  onOpenChange,
  project,
  pmName,
  fundingReceived,
  readinessReasons,
  onConfirm,
  isSubmitting,
}: ProjectStartExecutionDialogProps) {
  const { t, locale } = useTranslation()
  const notAvailable = t('common.notAvailable')
  const budget = Number(project.budget ?? 0)
  const underfunded = budget > 0 && fundingReceived < budget - 0.009
  const ready = readinessReasons.length === 0

  const handleConfirm = async () => {
    await onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('projects.startDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('projects.startDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-3 text-sm">
          <div className="app-panel space-y-2 p-3">
            <p className="font-medium">{project.title}</p>
            <p className="text-muted-foreground">
              {t('projects.approveDialog.assignedPm')}: {pmName}
            </p>
            <p className="text-muted-foreground">
              {t('common.budget')}:{' '}
              {formatLocalizedBudget(
                project.budget,
                project.currency,
                locale,
                notAvailable,
              )}
            </p>
            <p className="text-muted-foreground">
              {t('projects.startDialog.fundingReceived')}:{' '}
              {formatLocalizedBudget(
                fundingReceived,
                project.currency,
                locale,
                notAvailable,
              )}
            </p>
          </div>

          {!ready ? (
            <StatusMessage variant="error">
              {readinessReasons
                .map((reason) => t(`projects.executionNotReady.${reason}`))
                .join(' ')}
            </StatusMessage>
          ) : null}

          {ready && underfunded ? (
            <StatusMessage variant="warning">
              {t('projects.startDialog.fundingWarning')}
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
            disabled={isSubmitting || !ready}
            onClick={() => void handleConfirm()}
          >
            <Play className="size-4" />
            {isSubmitting
              ? t('common.submitting')
              : t('common.startExecution')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
