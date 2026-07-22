import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import type { EntityType } from '@/types/database'

export function useProjectRealtime(projectId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!projectId || !isSupabaseConfigured()) {
      return
    }

    const supabase = getSupabase()
    const channel = supabase
      .channel(`project-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.tasks(projectId),
          })
          void queryClient.invalidateQueries({
            queryKey: queryKeys.project(projectId),
          })
          void queryClient.invalidateQueries({ queryKey: queryKeys.projects })
          void queryClient.invalidateQueries({
            queryKey: queryKeys.escalations,
          })
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${projectId}`,
        },
        () => {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.project(projectId),
          })
          void queryClient.invalidateQueries({ queryKey: queryKeys.projects })
          void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [projectId, queryClient])
}

export function useCommentsRealtime(
  entityType: EntityType,
  entityId: string | undefined,
) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!entityId || !isSupabaseConfigured()) {
      return
    }

    const supabase = getSupabase()
    const channel = supabase
      .channel(`comments-${entityType}-${entityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `entity_id=eq.${entityId}`,
        },
        () => {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.comments(entityType, entityId),
          })
          void queryClient.invalidateQueries({
            queryKey: ['project-activity'],
          })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [entityId, entityType, queryClient])
}
