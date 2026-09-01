import { zodResolver } from '@hookform/resolvers/zod'
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
  createFundingFormSchema,
  type FundingFormValues,
} from '@/lib/validations/funding'
import type { FundingEntryStatus, FundingSourceType, ProjectFundingEntry } from '@/types/database'

const FUNDING_SOURCE_TYPES: FundingSourceType[] = [
  'internal',
  'loan',
  'grant',
  'partner',
  'other',
]

const FUNDING_STATUSES: FundingEntryStatus[] = [
  'planned',
  'received',
  'cancelled',
]

const FUNDING_FORM_DEFAULTS: FundingFormValues = {
  source_type: 'internal',
  source_name: '',
  amount: 0,
  expected_date: '',
  received_date: '',
  status: 'planned',
  notes: '',
}

interface FundingFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry?: ProjectFundingEntry | null
  onSubmit: (values: FundingFormValues) => Promise<void>
  isSubmitting: boolean
}

export function FundingFormDialog({
  open,
  onOpenChange,
  entry,
  onSubmit,
  isSubmitting,
}: FundingFormDialogProps) {
  const { t } = useTranslation()
  const schema = useValidationSchema(createFundingFormSchema)

  const { form, createSubmitHandler, isDirty } = useFormDialog({
    open,
    resolver: zodResolver(schema),
    defaultValues: FUNDING_FORM_DEFAULTS,
    getValues: () => ({
      source_type: entry?.source_type ?? 'internal',
      source_name: entry?.source_name ?? '',
      amount: entry?.amount ?? 0,
      expected_date: entry?.expected_date ?? '',
      received_date: entry?.received_date ?? '',
      status: entry?.status ?? 'planned',
      notes: entry?.notes ?? '',
    }),
    resetDependencies: [entry?.id],
  })

  const { discardOpen, handleOpenChange, confirmDiscard, cancelDiscard } =
    useFormDialogClose(isDirty, onOpenChange)
  const handleSubmit = createSubmitHandler(onSubmit, () => onOpenChange(false))
  const selectedStatus = form.watch('status')
  const selectedSource = form.watch('source_type')

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {entry
              ? t('projectFinance.funding.editTitle')
              : t('projectFinance.funding.addTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('projectFinance.funding.formDescription')}
          </DialogDescription>
        </DialogHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <Label>{t('projectFinance.funding.sourceType')}</Label>
              <Select
                value={selectedSource}
                onValueChange={(value) => {
                  if (
                    value === 'internal' ||
                    value === 'loan' ||
                    value === 'grant' ||
                    value === 'partner' ||
                    value === 'other'
                  ) {
                    form.setValue('source_type', value)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FUNDING_SOURCE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`projectFinance.funding.sourceTypes.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSource === 'other' ? (
              <div className="space-y-2">
                <Label htmlFor="funding-source-name">
                  {t('projectFinance.funding.sourceName')}
                </Label>
                <Input id="funding-source-name" {...form.register('source_name')} />
                <FormFieldError error={form.formState.errors.source_name} />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="funding-amount">{t('projectFinance.funding.amount')}</Label>
              <Input
                id="funding-amount"
                type="number"
                min="0"
                step="0.01"
                {...form.register('amount', { valueAsNumber: true })}
              />
              <FormFieldError error={form.formState.errors.amount} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('projectFinance.funding.expectedDate')}</Label>
                <DatePickerField
                  control={form.control}
                  name="expected_date"
                  allowClear
                />
              </div>
              <div className="space-y-2">
                <Label>{t('projectFinance.funding.receivedDate')}</Label>
                <DatePickerField
                  control={form.control}
                  name="received_date"
                  allowClear
                />
                <FormFieldError error={form.formState.errors.received_date} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('common.status')}</Label>
              <Select
                value={selectedStatus}
                onValueChange={(value) => {
                  if (
                    value === 'planned' ||
                    value === 'received' ||
                    value === 'cancelled'
                  ) {
                    form.setValue('status', value)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FUNDING_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {t(`projectFinance.funding.statuses.${status}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="funding-notes">{t('common.notes')}</Label>
              <Textarea id="funding-notes" rows={3} {...form.register('notes')} />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('common.saving') : t('common.save')}
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
