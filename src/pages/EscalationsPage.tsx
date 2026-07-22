import { format } from 'date-fns'
import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/contexts/AuthContext'
import { useCreateComment } from '@/hooks/useComments'
import { useEscalations } from '@/hooks/useEscalations'
import {
  escalationFormSchema,
  formatEscalationBody,
  type EscalationFormValues,
} from '@/lib/validations/comment'
import type { EscalationItem } from '@/hooks/useEscalations'

export function EscalationsPage() {
  const { data: escalations = [], isLoading, error } = useEscalations()
  const { user } = useAuth()
  const [selectedTask, setSelectedTask] = useState<EscalationItem | null>(null)
  const createComment = useCreateComment('task', selectedTask?.id)

  const form = useForm<EscalationFormValues>({
    resolver: zodResolver(escalationFormSchema),
    defaultValues: { message: '' },
  })

  const openEscalate = (task: EscalationItem) => {
    setSelectedTask(task)
    form.reset({ message: task.blocked_reason ?? '' })
  }

  const submitEscalation = form.handleSubmit(async (values) => {
    if (!user?.id || !selectedTask) {
      return
    }

    try {
      await createComment.mutateAsync({
        values: { body: formatEscalationBody(values.message) },
        authorId: user.id,
      })
      toast.success('Escalation sent to leadership')
      setSelectedTask(null)
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Unable to escalate'
      toast.error(message)
    }
  })

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
          <AlertTriangle className="size-8 text-red-600" />
          Escalations
        </h1>
        <p className="max-w-2xl text-slate-600">
          Blocked tasks across your scope. Escalate to notify leadership with
          context in the project activity feed.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading blocked tasks…</p>
      ) : null}

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error instanceof Error
            ? error.message
            : 'Failed to load escalations'}
        </p>
      ) : null}

      {!isLoading && !error ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Factory</TableHead>
                <TableHead>Blocked reason</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {escalations.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-slate-500"
                  >
                    No blocked tasks right now.
                  </TableCell>
                </TableRow>
              ) : (
                escalations.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{task.title}</p>
                        <p className="text-sm text-slate-500">
                          {task.phases?.name ?? 'Phase'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {task.projects ? (
                        <Link
                          className="font-medium hover:underline"
                          to={`/projects/${task.projects.id}`}
                        >
                          {task.projects.title}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {task.projects?.factories
                        ? `${task.projects.factories.name} (${task.projects.factories.code})`
                        : '—'}
                    </TableCell>
                    <TableCell className="max-w-xs text-sm text-red-700">
                      {task.blocked_reason ?? '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-slate-500">
                      {format(new Date(task.updated_at), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => openEscalate(task)}>
                        Escalate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : null}

      <Dialog
        open={Boolean(selectedTask)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTask(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escalate blocked task</DialogTitle>
            <DialogDescription>
              {selectedTask?.title} — leadership will see this in the activity
              feed.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitEscalation}>
            <Textarea rows={4} {...form.register('message')} />
            {form.formState.errors.message ? (
              <p className="text-sm text-red-600">
                {form.formState.errors.message.message}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedTask(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createComment.isPending}>
                {createComment.isPending ? 'Sending…' : 'Send escalation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}
