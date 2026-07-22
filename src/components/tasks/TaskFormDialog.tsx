import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
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
import { useFactoryProjectManagers } from '@/hooks/useProjects'
import { getTaskStatusLabel } from '@/lib/i18n-format'
import { TASK_STATUS_OPTIONS } from '@/lib/task-status'
import { taskFormSchema, type TaskFormValues } from '@/lib/validations/task'
import type { Task } from '@/types/database'

interface TaskFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: Task | null
  phaseName: string
  factoryId: string | null | undefined
  onSubmit: (values: TaskFormValues) => Promise<void>
  isSubmitting: boolean
}

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  phaseName,
  factoryId,
  onSubmit,
  isSubmitting,
}: TaskFormDialogProps) {
  const { t } = useTranslation()
  const { data: assignees = [] } = useFactoryProjectManagers(factoryId)

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'todo',
      blocked_reason: '',
      due_date: '',
      assignee_id: null,
    },
  })

  const selectedStatus = useWatch({ control: form.control, name: 'status' })
  const selectedAssigneeId = useWatch({
    control: form.control,
    name: 'assignee_id',
  })

  useEffect(() => {
    if (!open) {
      return
    }

    form.reset({
      title: task?.title ?? '',
      description: task?.description ?? '',
      status: task?.status ?? 'todo',
      blocked_reason: task?.blocked_reason ?? '',
      due_date: task?.due_date ?? '',
      assignee_id: task?.assignee_id ?? null,
    })
  }, [form, open, task])

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values)
    onOpenChange(false)
  })

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

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="task-title">{t('wbs.taskTitle')}</Label>
            <Input id="task-title" {...form.register('title')} />
            {form.formState.errors.title ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.title.message}
              </p>
            ) : null}
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
                {...form.register('due_date')}
              />
            </div>
          </div>

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
              {form.formState.errors.blocked_reason ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.blocked_reason.message}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>{t('wbs.assignee')}</Label>
            <Select
              value={selectedAssigneeId ?? 'none'}
              onValueChange={(value) =>
                form.setValue('assignee_id', value === 'none' ? null : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t('common.optional')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('common.unassigned')}</SelectItem>
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
