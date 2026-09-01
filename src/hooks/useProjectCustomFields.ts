import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import type {
  ProjectFieldDefinition,
  ProjectFieldDefinitionInsert,
  ProjectFieldDefinitionUpdate,
  ProjectFieldValue,
} from '@/types/database'

export function useProjectFieldDefinitions(activeOnly = false) {
  return useQuery({
    queryKey: [...queryKeys.projectFieldDefinitions, activeOnly] as const,
    enabled: isSupabaseConfigured(),
    queryFn: async (): Promise<ProjectFieldDefinition[]> => {
      const supabase = getSupabase()
      let query = supabase
        .from('project_field_definitions')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('key', { ascending: true })

      if (activeOnly) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query
      if (error) {
        throw error
      }
      return data
    },
    staleTime: 5 * 60_000,
  })
}

export function useProjectFieldValues(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projectFieldValues(projectId),
    enabled: Boolean(projectId) && isSupabaseConfigured(),
    queryFn: async (): Promise<ProjectFieldValue[]> => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('project_field_values')
        .select('*')
        .eq('project_id', projectId!)

      if (error) {
        throw error
      }
      return data
    },
  })
}

export function useCreateProjectFieldDefinition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: ProjectFieldDefinitionInsert) => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('project_field_definitions')
        .insert(values)
        .select('*')
        .single()

      if (error) {
        throw error
      }
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projectFieldDefinitions,
      })
    },
  })
}

export function useUpdateProjectFieldDefinition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...values
    }: ProjectFieldDefinitionUpdate & { id: string }) => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('project_field_definitions')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single()

      if (error) {
        throw error
      }
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projectFieldDefinitions,
      })
    },
  })
}

export function useDeleteProjectFieldDefinition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabase()
      const { error } = await supabase
        .from('project_field_definitions')
        .delete()
        .eq('id', id)

      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projectFieldDefinitions,
      })
    },
  })
}

export function useUpsertProjectFieldValues() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      projectId,
      values,
    }: {
      projectId: string
      values: Record<string, string>
    }) => {
      const rows = Object.entries(values).map(([fieldId, value]) => ({
        project_id: projectId,
        field_id: fieldId,
        value: value.trim() === '' ? null : value,
        updated_at: new Date().toISOString(),
      }))

      if (rows.length === 0) {
        return
      }

      const supabase = getSupabase()
      const { error } = await supabase
        .from('project_field_values')
        .upsert(rows, { onConflict: 'project_id,field_id' })

      if (error) {
        throw error
      }
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projectFieldValues(variables.projectId),
      })
    },
  })
}
