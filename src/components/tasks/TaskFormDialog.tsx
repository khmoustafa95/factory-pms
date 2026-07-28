import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { useWatch } from 'react-hook-form'
import { FormFieldError } from '@/components/FormFieldError'
import { Button } from '@/components/ui/button'
import {
  Dialog,
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
import { useFactoryProjectManagers } from '@/hooks/useProjects'
import { formatLocalizedDate, getTaskStatusLabel } from '@/lib/i18n-format'
import {
  formatNullableSelectValue,
  NULL_SELECT_VALUE,
  parseNullableSelectValue,
} from '@/lib/form-utils'
import { TASK_STATUS_OPTIONS } from '@/lib/task-status'
import {
  createTaskFormSchema,
  type TaskFormValues,
} from '@/lib/validations/task'
import type { Task } from '@/types/database'

interface TaskFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: Task | null
  phaseName: string
  phaseStartDate: string | null
  phaseEndDate: string | null
  factoryId: string | null | undefined
  onSubmit: (values: TaskFormValues) => Promise<void>
  isSubmitting: boolean
}

const TASK_FORM_DEFAULTS: TaskFormValues = {
  title: '',
  description: '',
  status: 'todo',
  blocked_reason: '',
  due_date: '',
  assignee_id: null,
}

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  phaseName,
  phaseStartDate,
  phaseEndDate,
  factoryId,
  onSubmit,
  isSubmitting,
}: TaskFormDialogProps) {
  const { t, locale } = useTranslation()
  const { data: assignees = [] } = useFactoryProjectManagers(factoryId)

  const taskFormSchema = useMemo(
    () =>
      createTaskFormSchema(t, {
        phaseStartDate,
        phaseEndDate,
      }),
    [phaseEndDate, phaseStartDate, t],
  )

  const { form, createSubmitHandler } = useFormDialog({
    open,
    resolver: zodResolver(taskFormSchema),
    defaultValues: TASK_FORM_DEFAULTS,
    getValues: () => ({
      title: task?.title ?? '',
      description: task?.description ?? '',
      status: task?.status ?? 'todo',
      blocked_reason: task?.blocked_reason ?? '',
      due_date: task?.due_date ?? '',
      assignee_id: task?.assignee_id ?? null,
    }),
    resetDependencies: [task],
  })

  const selectedStatus = useWatch({ control: form.control, name: 'status' })
  const selectedAssigneeId = useWatch({
    control: form.control,
    name: 'assignee_id',
  })

  const handleSubmit = createSubmitHandler(onSubmit, () => onOpenChange(false))

  const phaseRangeHint =
    phaseStartDate && phaseEndDate
      ? `${formatLocalizedDate(phaseStartDate, locale)} → ${formatLocalizedDate(phaseEndDate, locale)}`
      : t('wbs.noPhaseSchedule')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {task ? t('wbs.editTask') : t('wbs.newTask')}
          </DialogTitle>
          <DialogDescription>
            {t('common.phase')}: {phaseName}
          </DialogDescription>
        </DialogHeader>

        <form key={locale} className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="task-title">{t('wbs.taskTitle')}</Label>
            <Input id="task-title" {...form.register('title')} />
            <FormFieldError error={form.formState.errors.title} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description">{t('wbs.taskDescription')}</Label>
            <Textarea
              id="task-description"
              rows={3}
              {...form.register('description')}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('wbs.taskStatus')}</Label>
              <Select
                value={selectedStatus}
                onValueChange={(value) => {
                  if (
                    value === 'todo' ||
                    value === 'in_progress' ||
                    value === 'blocked' ||
                    value === 'done'
                  ) {
                    form.setValue('status', value)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {getTaskStatusLabel(t, status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-due-date">{t('wbs.taskDueDate')}</Label>
              <Input
                id="task-due-date"
                type="date"
                min={phaseStartDate ?? undefined}
                max={phaseEndDate ?? undefined}
                {...form.register('due_date')}
              />
              <FormFieldError error={form.formState.errors.due_date} />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {t('wbs.taskDueDateHint', { range: phaseRangeHint })}
          </p>

          {selectedStatus === 'blocked' ? (
            <div className="space-y-2">
              <Label htmlFor="task-blocked-reason">
                {t('wbs.blockedReasonLabel')}
              </Label>
              <Textarea
                id="task-blocked-reason"
                rows={3}
                {...form.register('blocked_reason')}
              />
              <FormFieldError error={form.formState.errors.blocked_reason} />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>{t('wbs.assignee')}</Label>
            <Select
              value={formatNullableSelectValue(selectedAssigneeId)}
              onValueChange={(value) =>
                form.setValue('assignee_id', parseNullableSelectValue(value))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t('common.optional')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NULL_SELECT_VALUE}>
                  {t('common.unassigned')}
                </SelectItem>
                {assignees.map((assignee) => (
                  <SelectItem key={assignee.id} value={assignee.id}>
                    {assignee.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? t('common.saving')
                : task
                  ? t('common.save')
                  : t('common.addTask')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
