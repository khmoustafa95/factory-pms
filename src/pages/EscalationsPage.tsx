import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { AdaptiveList } from '@/components/AdaptiveList'
import { PageHeader } from '@/components/PageHeader'
import { QueryState } from '@/components/QueryState'
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
import { useValidationSchema } from '@/hooks/useValidationSchema'
import {
  createEscalationFormSchema,
  formatEscalationBody,
  type EscalationFormValues,
} from '@/lib/validations/comment'
import type { EscalationItem } from '@/hooks/useEscalations'

export function EscalationsPage() {
  const { t, locale } = useTranslation()
  const {
    data: escalations = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useEscalations()
  const { user } = useAuth()
  const [selectedTask, setSelectedTask] = useState<EscalationItem | null>(null)
  const createComment = useCreateComment('task', selectedTask?.id)
  const notAvailable = t('common.notAvailable')
  const escalationFormSchema = useValidationSchema(createEscalationFormSchema)

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

      <QueryState
        isLoading={isLoading}
        error={error}
        loadingMessage={t('escalations.loading')}
        errorMessage={t('escalations.loadFailed')}
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      >
        <AdaptiveList
          items={escalations}
          emptyMessage={t('escalations.empty')}
          getKey={(task) => task.id}
          renderMobileCard={(task) => (
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="font-medium">{task.title}</p>
                <p className="text-sm text-muted-foreground">
                  {task.phases?.name ?? t('common.phase')}
                </p>
              </div>
              <p className="text-sm">
                <span className="font-medium text-muted-foreground">
                  {t('escalations.project')}:{' '}
                </span>
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
              </p>
              <p className="text-sm text-destructive">
                <span className="font-medium">
                  {t('escalations.blockedReason')}:{' '}
                </span>
                {task.blocked_reason ?? notAvailable}
              </p>
              <Button size="sm" onClick={() => openEscalate(task)}>
                {t('common.escalate')}
              </Button>
            </div>
          )}
        >
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
              {escalations.map((task) => (
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
              ))}
            </TableBody>
          </Table>
        </AdaptiveList>
      </QueryState>

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
          <form key={locale} className="space-y-4" onSubmit={submitEscalation}>
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
