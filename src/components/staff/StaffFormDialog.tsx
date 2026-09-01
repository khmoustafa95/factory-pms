import { zodResolver } from '@hookform/resolvers/zod'
import { DatePickerField } from '@/components/DatePicker'
import { FormFieldError } from '@/components/FormFieldError'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
  createStaffFormSchema,
  type StaffFormValues,
} from '@/lib/validations/staff'
import type { Phase, ProjectStaff } from '@/types/database'

const STAFF_FORM_DEFAULTS: StaffFormValues = {
  full_name: '',
  role_title: '',
  qualifications: '',
  headcount: 1,
  is_contractor: false,
  start_date: '',
  end_date: '',
  phase_id: '',
  notes: '',
}

interface StaffFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member?: ProjectStaff | null
  phases: Phase[]
  onSubmit: (values: StaffFormValues) => Promise<void>
  isSubmitting: boolean
}

export function StaffFormDialog({
  open,
  onOpenChange,
  member,
  phases,
  onSubmit,
  isSubmitting,
}: StaffFormDialogProps) {
  const { t } = useTranslation()
  const schema = useValidationSchema(createStaffFormSchema)

  const { form, createSubmitHandler } = useFormDialog({
    open,
    resolver: zodResolver(schema),
    defaultValues: STAFF_FORM_DEFAULTS,
    getValues: () => ({
      full_name: member?.full_name ?? '',
      role_title: member?.role_title ?? '',
      qualifications: member?.qualifications ?? '',
      headcount: member?.headcount ?? 1,
      is_contractor: member?.is_contractor ?? false,
      start_date: member?.start_date ?? '',
      end_date: member?.end_date ?? '',
      phase_id: member?.phase_id ?? '',
      notes: member?.notes ?? '',
    }),
    resetDependencies: [member?.id],
  })

  const handleSubmit = createSubmitHandler(onSubmit, () => onOpenChange(false))
  const selectedPhaseId = form.watch('phase_id')
  const isContractor = form.watch('is_contractor')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {member
              ? t('projectFinance.staff.editTitle')
              : t('projectFinance.staff.addTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('projectFinance.staff.formDescription')}
          </DialogDescription>
        </DialogHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="staff-name">{t('common.name')}</Label>
                <Input id="staff-name" {...form.register('full_name')} />
                <FormFieldError error={form.formState.errors.full_name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-role">
                  {t('projectFinance.staff.roleTitle')}
                </Label>
                <Input id="staff-role" {...form.register('role_title')} />
                <FormFieldError error={form.formState.errors.role_title} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff-qualifications">
                {t('projectFinance.staff.qualifications')}
              </Label>
              <Textarea
                id="staff-qualifications"
                rows={2}
                {...form.register('qualifications')}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="staff-headcount">
                  {t('projectFinance.staff.headcount')}
                </Label>
                <Input
                  id="staff-headcount"
                  type="number"
                  min="1"
                  step="1"
                  {...form.register('headcount', { valueAsNumber: true })}
                />
                <FormFieldError error={form.formState.errors.headcount} />
              </div>
              <div className="flex items-end gap-2 pb-2">
                <Checkbox
                  id="staff-contractor"
                  checked={isContractor}
                  onCheckedChange={(checked) =>
                    form.setValue('is_contractor', checked === true)
                  }
                />
                <Label htmlFor="staff-contractor">
                  {t('projectFinance.staff.isContractor')}
                </Label>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('projectFinance.staff.startDate')}</Label>
                <DatePickerField
                  control={form.control}
                  name="start_date"
                  allowClear
                />
              </div>
              <div className="space-y-2">
                <Label>{t('projectFinance.staff.endDate')}</Label>
                <DatePickerField
                  control={form.control}
                  name="end_date"
                  allowClear
                />
                <FormFieldError error={form.formState.errors.end_date} />
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
              <Label htmlFor="staff-notes">{t('common.notes')}</Label>
              <Textarea id="staff-notes" rows={3} {...form.register('notes')} />
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
