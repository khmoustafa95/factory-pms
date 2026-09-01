import { zodResolver } from '@hookform/resolvers/zod'
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
import { useValidationSchema } from '@/hooks/useValidationSchema'
import {
  formatNullableSelectValue,
  NULL_SELECT_VALUE,
  parseNullableSelectValue,
} from '@/lib/form-utils'
import {
  createExpenseLineFormSchema,
  type ExpenseLineFormValues,
} from '@/lib/validations/expense-line'
import type { ExpenseCategory, Phase, ProjectExpenseLine } from '@/types/database'

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'materials',
  'labor',
  'equipment',
  'overhead',
  'other',
]

const EXPENSE_LINE_FORM_DEFAULTS: ExpenseLineFormValues = {
  category: 'overhead',
  description: '',
  planned_amount: 0,
  actual_amount: null,
  phase_id: '',
  notes: '',
}

interface ExpenseLineFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  line?: ProjectExpenseLine | null
  phases: Phase[]
  onSubmit: (values: ExpenseLineFormValues) => Promise<void>
  isSubmitting: boolean
}

export function ExpenseLineFormDialog({
  open,
  onOpenChange,
  line,
  phases,
  onSubmit,
  isSubmitting,
}: ExpenseLineFormDialogProps) {
  const { t } = useTranslation()
  const schema = useValidationSchema(createExpenseLineFormSchema)

  const { form, createSubmitHandler } = useFormDialog({
    open,
    resolver: zodResolver(schema),
    defaultValues: EXPENSE_LINE_FORM_DEFAULTS,
    getValues: () => ({
      category: line?.category ?? 'overhead',
      description: line?.description ?? '',
      planned_amount: line?.planned_amount ?? 0,
      actual_amount: line?.actual_amount ?? null,
      phase_id: line?.phase_id ?? '',
      notes: line?.notes ?? '',
    }),
    resetDependencies: [line?.id],
  })

  const handleSubmit = createSubmitHandler(onSubmit, () => onOpenChange(false))
  const selectedCategory = form.watch('category')
  const selectedPhaseId = form.watch('phase_id')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {line
              ? t('projectFinance.expensePlan.editTitle')
              : t('projectFinance.expensePlan.addTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('projectFinance.expensePlan.formDescription')}
          </DialogDescription>
        </DialogHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <Label>{t('projectFinance.expensePlan.category')}</Label>
              <Select
                value={selectedCategory}
                onValueChange={(value) => {
                  if (
                    value === 'materials' ||
                    value === 'labor' ||
                    value === 'equipment' ||
                    value === 'overhead' ||
                    value === 'other'
                  ) {
                    form.setValue('category', value)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {t(`projectFinance.expensePlan.categories.${category}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-description">
                {t('common.description')}
              </Label>
              <Input id="expense-description" {...form.register('description')} />
              <FormFieldError error={form.formState.errors.description} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="expense-planned">
                  {t('projectFinance.expensePlan.plannedAmount')}
                </Label>
                <Input
                  id="expense-planned"
                  type="number"
                  min="0"
                  step="0.01"
                  {...form.register('planned_amount', { valueAsNumber: true })}
                />
                <FormFieldError error={form.formState.errors.planned_amount} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-actual">
                  {t('projectFinance.expensePlan.actualAmount')}
                </Label>
                <Input
                  id="expense-actual"
                  type="number"
                  min="0"
                  step="0.01"
                  {...form.register('actual_amount', {
                    setValueAs: (value) =>
                      value === '' || value == null ? null : Number(value),
                  })}
                />
                <FormFieldError error={form.formState.errors.actual_amount} />
              </div>
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
              <Label htmlFor="expense-notes">{t('common.notes')}</Label>
              <Textarea id="expense-notes" rows={3} {...form.register('notes')} />
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
