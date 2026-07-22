import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import type { Phase } from '@/types/database'
import type { PhaseFormValues } from '@/lib/validations/phase'
import { toPhasePayload } from '@/lib/validations/phase'

export function usePhases(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.phases(projectId),
    enabled: Boolean(projectId),
    queryFn: async (): Promise<Phase[]> => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('phases')
        .select('*')
        .eq('project_id', projectId!)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      return data
    },
  })
}

async function getNextSortOrder(
  table: 'phases' | 'tasks',
  filter: { column: string; value: string },
): Promise<number> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from(table)
    .select('sort_order')
    .eq(filter.column, filter.value)
    .order('sort_order', { ascending: false })
    .limit(1)

  if (error) {
    throw error
  }

  return (data[0]?.sort_order ?? -1) + 1
}

export function useCreatePhase(projectId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: PhaseFormValues) => {
      if (!projectId) {
        throw new Error('Project is required')
      }

      const supabase = getSupabase()
      const sortOrder = await getNextSortOrder('phases', {
        column: 'project_id',
        value: projectId,
      })

      const { data, error } = await supabase
        .from('phases')
        .insert({
          project_id: projectId,
          ...toPhasePayload(values),
          sort_order: sortOrder,
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
        queryKey: queryKeys.phases(projectId),
      })
    },
  })
}

export function useUpdatePhase(projectId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string
      values: PhaseFormValues
    }) => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('phases')
        .update(toPhasePayload(values))
        .eq('id', id)
        .select('*')
        .single()

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.phases(projectId),
      })
    },
  })
}

export function useDeletePhase(projectId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabase()
      const { error } = await supabase.from('phases').delete().eq('id', id)

      if (error) {
        throw error
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.phases(projectId),
      })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.tasks(projectId),
      })
    },
  })
}
