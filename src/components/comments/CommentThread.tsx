import { format } from 'date-fns'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/AuthContext'
import {
  useComments,
  useCreateComment,
  type CommentListItem,
} from '@/hooks/useComments'
import { useCommentsRealtime } from '@/hooks/useRealtime'
import { USER_ROLE_LABELS } from '@/lib/roles'
import {
  commentFormSchema,
  type CommentFormValues,
} from '@/lib/validations/comment'
import type { EntityType, UserRole } from '@/types/database'

interface CommentThreadProps {
  entityType: EntityType
  entityId: string
  title: string
  canComment: boolean
}

function CommentItem({ comment }: { comment: CommentListItem }) {
  const role = comment.author?.role as UserRole | undefined

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">
          {comment.author?.full_name ?? 'Unknown'}
        </span>
        {role ? (
          <span className="text-slate-500">{USER_ROLE_LABELS[role]}</span>
        ) : null}
        <span className="text-slate-400">
          {format(new Date(comment.created_at), 'dd MMM yyyy HH:mm')}
        </span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
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
  const { data: comments = [], isLoading } = useComments(entityType, entityId)
  const createComment = useCreateComment(entityType, entityId)
  useCommentsRealtime(entityType, entityId)

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
      toast.success('Comment added')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to add comment'
      toast.error(message)
    }
  })

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading comments…</p>
      ) : null}

      {comments.length === 0 && !isLoading ? (
        <p className="text-sm text-slate-500">No comments yet.</p>
      ) : (
        <div className="space-y-2">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      )}

      {canComment ? (
        <form className="space-y-2" onSubmit={onSubmit}>
          <Textarea
            rows={3}
            placeholder="Write a comment…"
            {...form.register('body')}
          />
          {form.formState.errors.body ? (
            <p className="text-sm text-red-600">
              {form.formState.errors.body.message}
            </p>
          ) : null}
          <Button type="submit" size="sm" disabled={createComment.isPending}>
            {createComment.isPending ? 'Posting…' : 'Post comment'}
          </Button>
        </form>
      ) : null}
    </div>
  )
}
