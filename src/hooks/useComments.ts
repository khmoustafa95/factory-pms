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
        queryKey: ['project-activity'],
      })
    },
  })
}

export type ActivityItem = CommentListItem

export function useProjectActivity(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projectActivity(projectId),
    enabled: Boolean(projectId),
    queryFn: async (): Promise<ActivityItem[]> => {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('get_project_activity', {
        p_project_id: projectId!,
      })

      if (error) {
        throw error
      }

      return (data ?? []).map((row) => ({
        id: row.id,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        author_id: row.author_id,
        body: row.body,
        created_at: row.created_at,
        updated_at: row.updated_at,
        author: {
          full_name: row.author_full_name,
          role: row.author_role,
        },
      }))
    },
  })
}
