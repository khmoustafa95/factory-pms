import { zodResolver } from '@hookform/resolvers/zod'
import { DiscardChangesDialog } from '@/components/DiscardChangesDialog'
import { FormFieldError } from '@/components/FormFieldError'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useTranslation } from '@/contexts/LocaleContext'
import { useFormDialog } from '@/hooks/useFormDialog'
import { useFormDialogClose } from '@/hooks/useFormDialogClose'
import { useValidationSchema } from '@/hooks/useValidationSchema'
import {
  createReassignPmSchema,
  type ReassignPmFormValues,
} from '@/lib/validations/governance'

interface ProjectReassignPmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPmId: string | null
  managers: Array<{ id: string; full_name: string }>
  onSubmit: (values: ReassignPmFormValues) => Promise<void>
  isSubmitting: boolean
}

export function ProjectReassignPmDialog({
  open,
  onOpenChange,
  currentPmId,
  managers,
  onSubmit,
  isSubmitting,
}: ProjectReassignPmDialogProps) {
  const { t } = useTranslation()
  const schema = useValidationSchema(createReassignPmSchema)
  const { form, createSubmitHandler, isDirty } = useFormDialog({
    open,
    resolver: zodResolver(schema),
    defaultValues: { assigned_pm_id: '', reason: '' },
    getValues: () => ({
      assigned_pm_id: currentPmId ?? '',
      reason: '',
    }),
    resetDependencies: [currentPmId],
  })
  const { discardOpen, handleOpenChange, confirmDiscard, cancelDiscard } =
    useFormDialogClose(isDirty, onOpenChange)
  const handleSubmit = createSubmitHandler(onSubmit, () => onOpenChange(false))
  const selected = form.watch('assigned_pm_id')

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('projects.reassignPm.title')}</DialogTitle>
            <DialogDescription>
              {t('projects.reassignPm.description')}
            </DialogDescription>
          </DialogHeader>

          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
            <DialogBody className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reassign-pm">{t('projects.assignedPm')}</Label>
                <Select
                  value={selected}
                  onValueChange={(value) =>
                    form.setValue('assigned_pm_id', value, { shouldDirty: true })
                  }
                >
                  <SelectTrigger id="reassign-pm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {managers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormFieldError error={form.formState.errors.assigned_pm_id} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reassign-reason">
                  {t('projects.reassignPm.reason')}
                </Label>
                <Textarea
                  id="reassign-reason"
                  rows={3}
                  {...form.register('reason')}
                />
                <FormFieldError error={form.formState.errors.reason} />
              </div>
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? t('common.submitting')
                  : t('projects.reassignPm.submit')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <DiscardChangesDialog
        open={discardOpen}
        onConfirm={confirmDiscard}
        onCancel={cancelDiscard}
      />
    </>
  )
}
