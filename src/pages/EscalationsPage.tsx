import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { ResponsiveTable } from '@/components/ResponsiveTable'
import { StatusMessage } from '@/components/StatusMessage'
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
import { useTranslation } from '@/contexts/LocaleContext'
import { useCreateComment } from '@/hooks/useComments'
import { useEscalations } from '@/hooks/useEscalations'
import { formatLocalizedDateTime } from '@/lib/i18n-format'
import {
  escalationFormSchema,
  formatEscalationBody,
  type EscalationFormValues,
} from '@/lib/validations/comment'
import type { EscalationItem } from '@/hooks/useEscalations'

export function EscalationsPage() {
  const { t, locale } = useTranslation()
  const { data: escalations = [], isLoading, error } = useEscalations()
  const { user } = useAuth()
  const [selectedTask, setSelectedTask] = useState<EscalationItem | null>(null)
  const createComment = useCreateComment('task', selectedTask?.id)
  const notAvailable = t('common.notAvailable')

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
      toast.success(t('escalations.sent'))
      setSelectedTask(null)
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : t('escalations.sendFailed')
      toast.error(message)
    }
  })

  return (
    <section className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <AlertTriangle className="size-8 text-destructive" />
            {t('escalations.title')}
          </span>
        }
        description={t('escalations.description')}
      />

      {isLoading ? (
        <StatusMessage>{t('escalations.loading')}</StatusMessage>
      ) : null}

      {error ? (
        <StatusMessage variant="error">
          {error instanceof Error ? error.message : t('escalations.loadFailed')}
        </StatusMessage>
      ) : null}

      {!isLoading && !error ? (
        <ResponsiveTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('escalations.task')}</TableHead>
                <TableHead>{t('escalations.project')}</TableHead>
                <TableHead>{t('common.factory')}</TableHead>
                <TableHead>{t('escalations.blockedReason')}</TableHead>
                <TableHead>{t('common.updated')}</TableHead>
                <TableHead className="text-right">
                  {t('common.actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {escalations.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    {t('escalations.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                escalations.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{task.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {task.phases?.name ?? t('common.phase')}
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
                        notAvailable
                      )}
                    </TableCell>
                    <TableCell>
                      {task.projects?.factories
                        ? `${task.projects.factories.name} (${task.projects.factories.code})`
                        : notAvailable}
                    </TableCell>
                    <TableCell className="max-w-xs text-sm text-destructive">
                      {task.blocked_reason ?? notAvailable}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatLocalizedDateTime(task.updated_at, locale)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => openEscalate(task)}>
                        {t('common.escalate')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ResponsiveTable>
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
            <DialogTitle>{t('escalations.escalateTitle')}</DialogTitle>
            <DialogDescription>
              {selectedTask
                ? t('escalations.escalateDescription', {
                    title: selectedTask.title,
                  })
                : null}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitEscalation}>
            <Textarea rows={4} {...form.register('message')} />
            {form.formState.errors.message ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.message.message}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedTask(null)}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createComment.isPending}>
                {createComment.isPending
                  ? t('common.sending')
                  : t('common.sendEscalation')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}
