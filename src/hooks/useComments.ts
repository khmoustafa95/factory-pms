import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import { joinMappers } from '@/lib/supabase-joins'
import type { CommentListItem } from '@/types/joins'
import { COMMENT_LIST_SELECT } from '@/types/joins'
import type { EntityType, ProjectStatus } from '@/types/database'
import type { CommentFormValues } from '@/lib/validations/comment'

export type { CommentListItem } from '@/types/joins'

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
        .select(COMMENT_LIST_SELECT)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId!)
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      return joinMappers.commentListItem(data)
    },
  })
}

export function useCreateComment(
  entityType: EntityType,
  entityId: string | undefined,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ values }: { values: CommentFormValues }) => {
      if (!entityId) {
        throw new Error('Entity is required')
      }

      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('create_comment', {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_body: values.body,
      })

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
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projectStatusTransitions(entityId),
      })
    },
  })
}

export type ActivityItem = {
  id: string
  activity_kind: 'comment' | 'status_transition'
  entity_type: EntityType
  entity_id: string
  author_id: string
  body: string | null
  from_status: ProjectStatus | null
  to_status: ProjectStatus | null
  reason: string | null
  created_at: string
  updated_at: string
  author: {
    full_name: string
    role: string
  }
}

export type StatusTransitionItem = {
  id: string
  fromStatus: ProjectStatus
  toStatus: ProjectStatus
  reason: string | null
  createdAt: string
  changedBy: {
    id: string
    fullName: string
    role: string
  }
}

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
        activity_kind:
          row.activity_kind === 'status_transition'
            ? 'status_transition'
            : 'comment',
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        author_id: row.author_id,
        body: row.body,
        from_status: row.from_status,
        to_status: row.to_status,
        reason: row.reason,
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

export function useProjectStatusTransitions(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projectStatusTransitions(projectId),
    enabled: Boolean(projectId),
    queryFn: async (): Promise<StatusTransitionItem[]> => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('project_status_transitions')
        .select(
          'id, from_status, to_status, changed_by, changed_by_name, changed_by_role, reason, created_at',
        )
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return (data ?? []).map((row) => ({
        id: row.id,
        fromStatus: row.from_status,
        toStatus: row.to_status,
        reason: row.reason,
        createdAt: row.created_at,
        changedBy: {
          id: row.changed_by,
          fullName: row.changed_by_name,
          role: row.changed_by_role,
        },
      }))
    },
  })
}
