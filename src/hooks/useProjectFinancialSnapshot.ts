import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { getSupabase } from '@/lib/supabase'
import type { ProjectFinancialSnapshot } from '@/types/database'

export function useProjectFinancialSnapshot(
  projectId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.projectFinancialSnapshot(projectId),
    enabled: Boolean(projectId) && enabled,
    queryFn: async (): Promise<ProjectFinancialSnapshot> => {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc(
        'get_project_financial_snapshot',
        { p_project_id: projectId! },
      )

      if (error) {
        throw error
      }

      const row = data?.[0]
      if (!row) {
        throw new Error('Financial snapshot not found')
      }

      return row
    },
  })
}

export function useProjectsFinancialSummary(enabled = true) {
  return useQuery({
    queryKey: queryKeys.projectsFinancialSummary,
    enabled,
    queryFn: async () => {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc(
        'get_projects_financial_summary',
      )

      if (error) {
        throw error
      }

      return data ?? []
    },
  })
}
