import { z } from 'zod'

export const taskFormSchema = z
  .object({
    title: z.string().trim().min(2, 'Title must be at least 2 characters'),
    description: z.string().trim().optional(),
    status: z.enum(['todo', 'in_progress', 'blocked', 'done']),
    blocked_reason: z.string().trim().optional(),
    due_date: z.string().trim().optional(),
    assignee_id: z.string().uuid().nullable(),
  })
  .superRefine((values, ctx) => {
    if (values.status === 'blocked') {
      if (!values.blocked_reason?.trim()) {
        ctx.addIssue({
          code: 'custom',
          message: 'Blocked reason is required',
          path: ['blocked_reason'],
        })
      }
    }

    if (values.status !== 'blocked' && values.blocked_reason?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Clear blocked reason when status is not blocked',
        path: ['blocked_reason'],
      })
    }
  })

export type TaskFormValues = z.infer<typeof taskFormSchema>

export function toTaskPayload(values: TaskFormValues) {
  return {
    title: values.title,
    description: values.description?.trim() ? values.description.trim() : null,
    status: values.status,
    blocked_reason:
      values.status === 'blocked'
        ? (values.blocked_reason?.trim() ?? null)
        : null,
    due_date: values.due_date?.trim() ? values.due_date.trim() : null,
    assignee_id: values.assignee_id,
  }
}
