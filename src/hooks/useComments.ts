import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import type { Comment, EntityType } from '@/types/database'
import type { CommentFormValues } from '@/lib/validations/comment'

export type CommentListItem = Comment & {
  author: { full_name: string; role: string } | null
}

export function useComments(
  entityType: EntityType,
  entityId: string | undefined,
) {
  return useQuery({
    queryKey: queryKeys.comments(entityType, entityId),
    enabled: Boolean(entityId),
    queryFn: async (): Promise<CommentListItem[]> => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('comments')
        .select(
          `
          *,
          author:profiles!author_id (full_name, role)
        `,
        )
        .eq('entity_type', entityType)
        .eq('entity_id', entityId!)
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      return data as unknown as CommentListItem[]
    },
  })
}

export function useCreateComment(
  entityType: EntityType,
  entityId: string | undefined,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      values,
      authorId,
    }: {
      values: CommentFormValues
      authorId: string
    }) => {
      if (!entityId) {
        throw new Error('Entity is required')
      }

      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('comments')
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          author_id: authorId,
          body: values.body.trim(),
        })
        .select('*')
        .single()

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.comments(entityType, entityId),
      })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projectActivity,
      })
    },
  })
}

export type ActivityItem = CommentListItem & {
  context_label: string
}

async function fetchCommentsByType(
  entityType: EntityType,
  entityIds: string[],
): Promise<CommentListItem[]> {
  if (entityIds.length === 0) {
    return []
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('comments')
    .select(`*, author:profiles!author_id (full_name, role)`)
    .eq('entity_type', entityType)
    .in('entity_id', entityIds)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data as unknown as CommentListItem[]
}

export function useProjectActivity(
  projectId: string | undefined,
  phaseIds: string[],
  taskIds: string[],
) {
  return useQuery({
    queryKey: [...queryKeys.projectActivity, projectId, phaseIds, taskIds],
    enabled: Boolean(projectId),
    queryFn: async (): Promise<ActivityItem[]> => {
      const [projectComments, phaseComments, taskComments] = await Promise.all([
        fetchCommentsByType('project', projectId ? [projectId] : []),
        fetchCommentsByType('phase', phaseIds),
        fetchCommentsByType('task', taskIds),
      ])

      const items: ActivityItem[] = [
        ...projectComments.map((comment) => ({
          ...comment,
          context_label: 'Project',
        })),
        ...phaseComments.map((comment) => ({
          ...comment,
          context_label: 'Phase',
        })),
        ...taskComments.map((comment) => ({
          ...comment,
          context_label: 'Task',
        })),
      ]

      return items.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
    },
  })
}
