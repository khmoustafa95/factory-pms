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
import { useFactoryProjectManagers } from '@/hooks/useProjects'
import { TASK_STATUS_LABELS, TASK_STATUS_OPTIONS } from '@/lib/task-status'
import { taskFormSchema, type TaskFormValues } from '@/lib/validations/task'
import type { Task, TaskStatus } from '@/types/database'

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
          <DialogTitle>{task ? 'Edit task' : 'Add task'}</DialogTitle>
          <DialogDescription>Phase: {phaseName}</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input id="task-title" {...form.register('title')} />
            {form.formState.errors.title ? (
              <p className="text-sm text-red-600">
                {form.formState.errors.title.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              rows={3}
              {...form.register('description')}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={selectedStatus}
                onValueChange={(value) =>
                  form.setValue('status', value as TaskStatus)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUS_OPTIONS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {TASK_STATUS_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-due-date">Due date</Label>
              <Input
                id="task-due-date"
                type="date"
                {...form.register('due_date')}
              />
            </div>
          </div>

          {selectedStatus === 'blocked' ? (
            <div className="space-y-2">
              <Label htmlFor="task-blocked-reason">Blocked reason</Label>
              <Textarea
                id="task-blocked-reason"
                rows={3}
                {...form.register('blocked_reason')}
              />
              {form.formState.errors.blocked_reason ? (
                <p className="text-sm text-red-600">
                  {form.formState.errors.blocked_reason.message}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Assignee</Label>
            <Select
              value={selectedAssigneeId ?? 'none'}
              onValueChange={(value) =>
                form.setValue('assignee_id', value === 'none' ? null : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
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
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : task ? 'Save changes' : 'Add task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
