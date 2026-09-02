import { zodResolver } from '@hookform/resolvers/zod'
import { useWatch } from 'react-hook-form'
import { DatePickerField } from '@/components/DatePicker'
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
import { Input } from '@/components/ui/input'
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
  createChangeRequestSchema,
  type ChangeRequestFormValues,
} from '@/lib/validations/governance'

interface ProjectChangeRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentBudget: number | null
  currentStart: string | null
  currentEnd: string | null
  onSubmit: (values: ChangeRequestFormValues) => Promise<void>
  isSubmitting: boolean
}

const DEFAULTS: ChangeRequestFormValues = {
  change_kind: 'budget',
  reason: '',
  requested_budget: '',
  requested_start_date: '',
  requested_end_date: '',
}

export function ProjectChangeRequestDialog({
  open,
  onOpenChange,
  currentBudget,
  currentStart,
  currentEnd,
  onSubmit,
  isSubmitting,
}: ProjectChangeRequestDialogProps) {
  const { t } = useTranslation()
  const schema = useValidationSchema(createChangeRequestSchema)
  const { form, createSubmitHandler, isDirty } = useFormDialog({
    open,
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
    getValues: () => ({
      ...DEFAULTS,
      requested_budget: currentBudget != null ? String(currentBudget) : '',
      requested_start_date: currentStart ?? '',
      requested_end_date: currentEnd ?? '',
    }),
    resetDependencies: [currentBudget, currentStart, currentEnd],
  })
  const kind = useWatch({ control: form.control, name: 'change_kind' })
  const { discardOpen, handleOpenChange, confirmDiscard, cancelDiscard } =
    useFormDialogClose(isDirty, onOpenChange)
  const handleSubmit = createSubmitHandler(onSubmit, () => onOpenChange(false))

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('projects.changeRequest.title')}</DialogTitle>
            <DialogDescription>
              {t('projects.changeRequest.description')}
            </DialogDescription>
          </DialogHeader>

          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
            <DialogBody className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="change-kind">
                  {t('projects.changeRequest.kind')}
                </Label>
                <Select
                  value={kind}
                  onValueChange={(value) =>
                    form.setValue('change_kind', value as 'budget' | 'schedule', {
                      shouldDirty: true,
                    })
                  }
                >
                  <SelectTrigger id="change-kind">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="budget">
                      {t('projects.changeRequest.kinds.budget')}
                    </SelectItem>
                    <SelectItem value="schedule">
                      {t('projects.changeRequest.kinds.schedule')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {kind === 'budget' ? (
                <div className="space-y-2">
                  <Label htmlFor="requested-budget">
                    {t('projects.changeRequest.requestedBudget')}
                  </Label>
                  <Input
                    id="requested-budget"
                    inputMode="decimal"
                    {...form.register('requested_budget')}
                  />
                  <FormFieldError
                    error={form.formState.errors.requested_budget}
                  />
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('projects.changeRequest.startDate')}</Label>
                    <DatePickerField
                      id="change-start"
                      control={form.control}
                      name="requested_start_date"
                    />
                    <FormFieldError
                      error={form.formState.errors.requested_start_date}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('projects.changeRequest.endDate')}</Label>
                    <DatePickerField
                      id="change-end"
                      control={form.control}
                      name="requested_end_date"
                    />
                    <FormFieldError
                      error={form.formState.errors.requested_end_date}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="change-reason">
                  {t('projects.changeRequest.reason')}
                </Label>
                <Textarea id="change-reason" rows={3} {...form.register('reason')} />
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
                  : t('projects.changeRequest.submit')}
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
