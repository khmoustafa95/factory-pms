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
import { useTranslation } from '@/contexts/LocaleContext'
import { formatLocalizedBudget, formatLocalizedDate } from '@/lib/i18n-format'
import type { Project } from '@/types/database'

interface ProjectApproveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project
  pmName: string
  attachmentCount: number
  fundingTotal: number
  onConfirm: () => Promise<void>
  isSubmitting: boolean
}

export function ProjectApproveDialog({
  open,
  onOpenChange,
  project,
  pmName,
  attachmentCount,
  fundingTotal,
  onConfirm,
  isSubmitting,
}: ProjectApproveDialogProps) {
  const { t, locale } = useTranslation()
  const notAvailable = t('common.notAvailable')

  const handleConfirm = async () => {
    await onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('projects.approveDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('projects.approveDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-3 text-sm">
          <div className="app-panel space-y-2 p-3">
            <p className="font-medium">{project.title}</p>
            <p className="text-muted-foreground">
              {t('common.code')}: {project.code || notAvailable}
            </p>
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
            {project.proposed_start_date && project.proposed_end_date ? (
              <p className="text-muted-foreground">
                {t('common.timeline')}:{' '}
                {formatLocalizedDate(project.proposed_start_date, locale)} →{' '}
                {formatLocalizedDate(project.proposed_end_date, locale)}
              </p>
            ) : null}
            <p className="text-muted-foreground">
              {t('projects.approveDialog.attachmentCount')}: {attachmentCount}
            </p>
            <p className="text-muted-foreground">
              {t('projects.approveDialog.fundingTotal')}:{' '}
              {formatLocalizedBudget(
                fundingTotal,
                project.currency,
                locale,
                notAvailable,
              )}
            </p>
          </div>
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
            disabled={isSubmitting}
            onClick={() => void handleConfirm()}
          >
            <Check className="size-4" />
            {isSubmitting
              ? t('common.submitting')
              : t('projects.approveDialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
