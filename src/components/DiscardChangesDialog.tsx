import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useTranslation } from '@/contexts/LocaleContext'

export function DiscardChangesDialog({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onCancel()
        }
      }}
      title={t('common.discardChanges')}
      description={t('common.discardChangesDescription')}
      confirmLabel={t('common.discardChanges')}
      cancelLabel={t('common.keepEditing')}
      variant="destructive"
      onConfirm={onConfirm}
    />
  )
}
