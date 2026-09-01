import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getNextSortOrder,
  invalidateProjectFinanceQueries,
} from '@/lib/project-finance-queries'
import { queryKeys } from '@/lib/query-keys'
import { getSupabase } from '@/lib/supabase'
import type { ProcurementFormValues } from '@/lib/validations/procurement'
import { toProcurementPayload } from '@/lib/validations/procurement'
import type { ProjectProcurementItem } from '@/types/database'

export function useProjectProcurement(
  projectId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.projectProcurement(projectId),
    enabled: Boolean(projectId) && enabled,
    queryFn: async (): Promise<ProjectProcurementItem[]> => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('project_procurement_items')
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

export function useCreateProjectProcurement(projectId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: ProcurementFormValues) => {
      if (!projectId) {
        throw new Error('Project is required')
      }

      const supabase = getSupabase()
      const sortOrder = await getNextSortOrder(
        'project_procurement_items',
        projectId,
      )
      const { data, error } = await supabase
        .from('project_procurement_items')
        .insert({
          project_id: projectId,
          sort_order: sortOrder,
          ...toProcurementPayload(values),
        })
        .select('*')
        .single()

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: async () => {
      await invalidateProjectFinanceQueries(queryClient, projectId)
    },
  })
}

export function useUpdateProjectProcurement(projectId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string
      values: ProcurementFormValues
    }) => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('project_procurement_items')
        .update(toProcurementPayload(values))
        .eq('id', id)
        .select('*')
        .single()

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: async () => {
      await invalidateProjectFinanceQueries(queryClient, projectId)
    },
  })
}

export function useDeleteProjectProcurement(projectId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabase()
      const { error } = await supabase
        .from('project_procurement_items')
        .delete()
        .eq('id', id)

      if (error) {
        throw error
      }
    },
    onSuccess: async () => {
      await invalidateProjectFinanceQueries(queryClient, projectId)
    },
  })
}
