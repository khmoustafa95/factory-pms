import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { QueryState } from '@/components/QueryState'
import { useTranslation } from '@/contexts/LocaleContext'
import {
  useComments,
  useCreateComment,
  useMentionableProfiles,
  type CommentListItem,
} from '@/hooks/useComments'
import { useCommentsRealtime } from '@/hooks/useRealtime'
import { formatLocalizedDateTime, getRoleLabel } from '@/lib/i18n-format'
import {
  formatMentionToken,
  parseCommentBody,
  resolveMentionedUserIds,
  type MentionCandidate,
} from '@/lib/mentions'
import { useValidationSchema } from '@/hooks/useValidationSchema'
import {
  createCommentFormSchema,
  type CommentFormValues,
} from '@/lib/validations/comment'
import { cn } from '@/lib/utils'
import type { EntityType, UserRole } from '@/types/database'

interface CommentThreadProps {
  entityType: EntityType
  entityId: string
  /** Project id used for mention candidates (required for @mentions). */
  projectId: string
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

function CommentBody({ body }: { body: string }) {
  const parts = parseCommentBody(body)

  return (
    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
      {parts.map((part, index) => {
        if (part.kind === 'mention') {
          return (
            <span
              key={`${part.userId ?? part.label}-${index}`}
              className="mx-0.5 inline-flex translate-y-px items-center rounded-md border border-primary/15 bg-primary/8 px-1.5 py-0.5 text-[0.8125rem] font-medium text-primary align-baseline dark:border-primary/25 dark:bg-primary/15"
            >
              <span className="me-0.5 opacity-60" aria-hidden>
                @
              </span>
              <span>{part.label}</span>
            </span>
          )
        }

        return <span key={`text-${index}`}>{part.value}</span>
      })}
    </p>
  )
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
      <CommentBody body={comment.body} />
    </div>
  )
}

function MentionComposer({
  projectId,
  onSubmit,
  isSubmitting,
}: {
  projectId: string
  onSubmit: (
    values: CommentFormValues,
    mentionedUserIds: string[],
  ) => Promise<void>
  isSubmitting: boolean
}) {
  const { t, locale } = useTranslation()
  const commentFormSchema = useValidationSchema(createCommentFormSchema)
  const { data: candidates = [] } = useMentionableProfiles(projectId)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [selectedMentions, setSelectedMentions] = useState(
    () => new Map<string, string>(),
  )
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionStart, setMentionStart] = useState<number | null>(null)
  const [highlightIndex, setHighlightIndex] = useState(0)

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: { body: '' },
  })

  const { ref: registerRef, ...bodyRegister } = form.register('body')

  const filteredCandidates =
    mentionQuery === null
      ? []
      : candidates
          .filter((candidate) => {
            const q = mentionQuery.toLowerCase()
            return (
              candidate.full_name.toLowerCase().includes(q) ||
              candidate.email.toLowerCase().includes(q)
            )
          })
          .slice(0, 8)

  const syncMentionState = (value: string, caret: number) => {
    const before = value.slice(0, caret)
    const atIndex = before.lastIndexOf('@')
    if (atIndex < 0) {
      setMentionQuery(null)
      setMentionStart(null)
      return
    }

    const charBefore = atIndex === 0 ? ' ' : before[atIndex - 1]
    if (charBefore && !/\s/.test(charBefore)) {
      setMentionQuery(null)
      setMentionStart(null)
      return
    }

    const query = before.slice(atIndex + 1)
    if (query.includes('\n') || query.includes(']')) {
      setMentionQuery(null)
      setMentionStart(null)
      return
    }

    setMentionStart(atIndex)
    if (mentionQuery !== query) {
      setHighlightIndex(0)
    }
    setMentionQuery(query)
  }

  const insertMention = (candidate: MentionCandidate) => {
    if (mentionStart === null || !textareaRef.current) {
      return
    }

    const el = textareaRef.current
    const value = form.getValues('body')
    const caret = el.selectionStart
    const token = formatMentionToken(candidate)
    const next = `${value.slice(0, mentionStart)}${token} ${value.slice(caret)}`
    setSelectedMentions((prev) => {
      const nextMap = new Map(prev)
      nextMap.set(candidate.id, candidate.full_name)
      return nextMap
    })
    form.setValue('body', next, { shouldDirty: true, shouldValidate: true })
    setMentionQuery(null)
    setMentionStart(null)

    const nextCaret = mentionStart + token.length + 1
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(nextCaret, nextCaret)
    })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery === null || filteredCandidates.length === 0) {
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightIndex((index) => (index + 1) % filteredCandidates.length)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightIndex(
        (index) =>
          (index - 1 + filteredCandidates.length) % filteredCandidates.length,
      )
      return
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      const selected = filteredCandidates[highlightIndex]
      if (selected) {
        insertMention(selected)
      }
      return
    }

    if (event.key === 'Escape') {
      setMentionQuery(null)
      setMentionStart(null)
    }
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    const mentionedUserIds = resolveMentionedUserIds(
      values.body,
      selectedMentions,
    )
    await onSubmit(values, mentionedUserIds)
    setSelectedMentions(new Map())
    form.reset()
    setMentionQuery(null)
    setMentionStart(null)
  })

  return (
    <form key={locale} className="relative space-y-2" onSubmit={handleSubmit}>
      <Textarea
        rows={3}
        placeholder={t('activity.placeholderWithMention')}
        {...bodyRegister}
        ref={(element) => {
          registerRef(element)
          textareaRef.current = element
        }}
        onKeyDown={handleKeyDown}
        onChange={(event) => {
          bodyRegister.onChange(event)
          syncMentionState(event.target.value, event.target.selectionStart)
        }}
        onClick={(event) => {
          syncMentionState(
            event.currentTarget.value,
            event.currentTarget.selectionStart,
          )
        }}
        onKeyUp={(event) => {
          syncMentionState(
            event.currentTarget.value,
            event.currentTarget.selectionStart,
          )
        }}
      />

      {mentionQuery !== null && filteredCandidates.length > 0 ? (
        <ul
          className="absolute z-20 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md"
          role="listbox"
          aria-label={t('activity.mentionSuggestions')}
        >
          {filteredCandidates.map((candidate, index) => (
            <li key={candidate.id}>
              <button
                type="button"
                role="option"
                aria-selected={index === highlightIndex}
                className={cn(
                  'flex w-full flex-col rounded-sm px-2 py-1.5 text-start text-sm',
                  index === highlightIndex
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-muted',
                )}
                onMouseDown={(event) => {
                  event.preventDefault()
                  insertMention(candidate)
                }}
              >
                <span className="font-medium">{candidate.full_name}</span>
                <span className="text-xs text-muted-foreground">
                  {getRoleLabel(t, candidate.role)} · {candidate.email}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {form.formState.errors.body ? (
        <p className="text-sm text-destructive">
          {form.formState.errors.body.message}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {t('activity.mentionHint')}
        </p>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? t('activity.posting') : t('activity.post')}
        </Button>
      </div>
    </form>
  )
}

export function CommentThread({
  entityType,
  entityId,
  projectId,
  title,
  canComment,
}: CommentThreadProps) {
  const { t } = useTranslation()
  const {
    data: comments = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useComments(entityType, entityId)
  const createComment = useCreateComment(entityType, entityId)
  useCommentsRealtime(entityType, entityId)

  const handleSubmit = async (
    values: CommentFormValues,
    mentionedUserIds: string[],
  ) => {
    try {
      await createComment.mutateAsync({ values, mentionedUserIds })
      toast.success(t('activity.commentAdded'))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('activity.commentFailed')
      toast.error(message)
    }
  }

  let titleNode: ReactNode = null
  if (title) {
    titleNode = (
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    )
  }

  return (
    <div className="space-y-3">
      {titleNode}

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
        <MentionComposer
          projectId={projectId}
          isSubmitting={createComment.isPending}
          onSubmit={handleSubmit}
        />
      ) : null}
    </div>
  )
}
