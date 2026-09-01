import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { DatePickerField } from '@/components/DatePicker'
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
import {
  formatNullableSelectValue,
  NULL_SELECT_VALUE,
  parseNullableSelectValue,
} from '@/lib/form-utils'
import {
  createProcurementFormSchema,
  type ProcurementFormValues,
} from '@/lib/validations/procurement'
import type { Phase, ProcurementStatus, ProjectProcurementItem } from '@/types/database'

const PROCUREMENT_STATUSES: ProcurementStatus[] = [
  'planned',
  'ordered',
  'delivered',
  'cancelled',
]

const PROCUREMENT_FORM_DEFAULTS: ProcurementFormValues = {
  description: '',
  quantity: 1,
  unit: 'unit',
  estimated_cost: 0,
  needed_by_date: '',
  supplier: '',
  status: 'planned',
  phase_id: '',
  notes: '',
}

interface ProcurementFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: ProjectProcurementItem | null
  phases: Phase[]
  onSubmit: (values: ProcurementFormValues) => Promise<void>
  isSubmitting: boolean
}

export function ProcurementFormDialog({
  open,
  onOpenChange,
  item,
  phases,
  onSubmit,
  isSubmitting,
}: ProcurementFormDialogProps) {
  const { t, locale } = useTranslation()
  const schema = useMemo(() => createProcurementFormSchema(t), [t])

  const { form, createSubmitHandler } = useFormDialog({
    open,
    resolver: zodResolver(schema),
    defaultValues: PROCUREMENT_FORM_DEFAULTS,
    getValues: () => ({
      description: item?.description ?? '',
      quantity: item?.quantity ?? 1,
      unit: item?.unit ?? 'unit',
      estimated_cost: item?.estimated_cost ?? 0,
      needed_by_date: item?.needed_by_date ?? '',
      supplier: item?.supplier ?? '',
      status: item?.status ?? 'planned',
      phase_id: item?.phase_id ?? '',
      notes: item?.notes ?? '',
    }),
    resetDependencies: [item?.id],
  })

  const handleSubmit = createSubmitHandler(onSubmit, () => onOpenChange(false))
  const selectedStatus = form.watch('status')
  const selectedPhaseId = form.watch('phase_id')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {item
              ? t('projectFinance.procurement.editTitle')
              : t('projectFinance.procurement.addTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('projectFinance.procurement.formDescription')}
          </DialogDescription>
        </DialogHeader>

        <form
          key={locale}
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={handleSubmit}
        >
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="procurement-description">
                {t('common.description')}
              </Label>
              <Input
                id="procurement-description"
                {...form.register('description')}
              />
              <FormFieldError error={form.formState.errors.description} />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="procurement-quantity">
                  {t('projectFinance.procurement.quantity')}
                </Label>
                <Input
                  id="procurement-quantity"
                  type="number"
                  min="0"
                  step="0.001"
                  {...form.register('quantity', { valueAsNumber: true })}
                />
                <FormFieldError error={form.formState.errors.quantity} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="procurement-unit">
                  {t('projectFinance.procurement.unit')}
                </Label>
                <Input id="procurement-unit" {...form.register('unit')} />
                <FormFieldError error={form.formState.errors.unit} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="procurement-cost">
                  {t('projectFinance.procurement.estimatedCost')}
                </Label>
                <Input
                  id="procurement-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  {...form.register('estimated_cost', { valueAsNumber: true })}
                />
                <FormFieldError error={form.formState.errors.estimated_cost} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('projectFinance.procurement.neededBy')}</Label>
                <DatePickerField
                  control={form.control}
                  name="needed_by_date"
                  allowClear
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="procurement-supplier">
                  {t('projectFinance.procurement.supplier')}
                </Label>
                <Input id="procurement-supplier" {...form.register('supplier')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('common.status')}</Label>
              <Select
                value={selectedStatus}
                onValueChange={(value) => {
                  if (
                    value === 'planned' ||
                    value === 'ordered' ||
                    value === 'delivered' ||
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
                  {PROCUREMENT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {t(`projectFinance.procurement.statuses.${status}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {phases.length > 0 ? (
              <div className="space-y-2">
                <Label>{t('common.phase')}</Label>
                <Select
                  value={formatNullableSelectValue(selectedPhaseId)}
                  onValueChange={(value) =>
                    form.setValue('phase_id', parseNullableSelectValue(value) ?? '')
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.optional')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NULL_SELECT_VALUE}>
                      {t('common.optional')}
                    </SelectItem>
                    {phases.map((phase) => (
                      <SelectItem key={phase.id} value={phase.id}>
                        {phase.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="procurement-notes">{t('common.notes')}</Label>
              <Textarea id="procurement-notes" rows={3} {...form.register('notes')} />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
