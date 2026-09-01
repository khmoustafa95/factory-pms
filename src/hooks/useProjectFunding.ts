import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invalidateProjectFinanceQueries } from '@/lib/project-finance-queries'
import { queryKeys } from '@/lib/query-keys'
import { getSupabase } from '@/lib/supabase'
import type { FundingFormValues } from '@/lib/validations/funding'
import { toFundingPayload } from '@/lib/validations/funding'
import type { ProjectFundingEntry } from '@/types/database'

export function useProjectFunding(
  projectId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.projectFunding(projectId),
    enabled: Boolean(projectId) && enabled,
    queryFn: async (): Promise<ProjectFundingEntry[]> => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('project_funding_entries')
        .select('*')
        .eq('project_id', projectId!)
        .order('expected_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      return data
    },
  })
}

export function useCreateProjectFunding(projectId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: FundingFormValues) => {
      if (!projectId) {
        throw new Error('Project is required')
      }

      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('project_funding_entries')
        .insert({
          project_id: projectId,
          ...toFundingPayload(values),
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

export function useUpdateProjectFunding(projectId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string
      values: FundingFormValues
    }) => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('project_funding_entries')
        .update(toFundingPayload(values))
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

export function useDeleteProjectFunding(projectId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabase()
      const { error } = await supabase
        .from('project_funding_entries')
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
