import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { QueryState } from '@/components/QueryState'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/contexts/LocaleContext'
import {
  useComments,
  useCreateComment,
  type CommentListItem,
} from '@/hooks/useComments'
import { useCommentsRealtime } from '@/hooks/useRealtime'
import { formatLocalizedDateTime, getRoleLabel } from '@/lib/i18n-format'
import { useValidationSchema } from '@/hooks/useValidationSchema'
import {
  createCommentFormSchema,
  type CommentFormValues,
} from '@/lib/validations/comment'
import type { EntityType, UserRole } from '@/types/database'

interface CommentThreadProps {
  entityType: EntityType
  entityId: string
  title: string
  canComment: boolean
}

function parseUserRole(role: string | undefined): UserRole | undefined {
  if (
    role === 'company_director' ||
    role === 'factory_manager' ||
    role === 'project_manager'
  ) {
    return role
  }

  return undefined
}

function CommentItem({ comment }: { comment: CommentListItem }) {
  const { t, locale } = useTranslation()
  const role = parseUserRole(comment.author?.role)

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">
          {comment.author?.full_name ?? t('common.user')}
        </span>
        {role ? (
          <span className="text-muted-foreground">{getRoleLabel(t, role)}</span>
        ) : null}
        <span className="text-muted-foreground">
          {formatLocalizedDateTime(comment.created_at, locale)}
        </span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
        {comment.body}
      </p>
    </div>
  )
}

export function CommentThread({
  entityType,
  entityId,
  title,
  canComment,
}: CommentThreadProps) {
  const { user } = useAuth()
  const { t, locale } = useTranslation()
  const {
    data: comments = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useComments(entityType, entityId)
  const createComment = useCreateComment(entityType, entityId)
  useCommentsRealtime(entityType, entityId)
  const commentFormSchema = useValidationSchema(createCommentFormSchema)

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: { body: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    if (!user?.id) {
      return
    }

    try {
      await createComment.mutateAsync({ values, authorId: user.id })
      form.reset()
      toast.success(t('activity.commentAdded'))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('activity.commentFailed')
      toast.error(message)
    }
  })

  return (
    <div className="space-y-3">
      {title ? (
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      ) : null}

      <QueryState
        isLoading={isLoading}
        error={error}
        loadingMessage={t('common.loading')}
        errorMessage={t('activity.loadFailed')}
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      >
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('activity.empty')}</p>
        ) : (
          <div className="space-y-2">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </div>
        )}
      </QueryState>

      {canComment ? (
        <form key={locale} className="space-y-2" onSubmit={onSubmit}>
          <Textarea
            rows={3}
            placeholder={t('activity.placeholder')}
            {...form.register('body')}
          />
          {form.formState.errors.body ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.body.message}
            </p>
          ) : null}
          <Button type="submit" size="sm" disabled={createComment.isPending}>
            {createComment.isPending
              ? t('activity.posting')
              : t('activity.post')}
          </Button>
        </form>
      ) : null}
    </div>
  )
}
