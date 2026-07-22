import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import type { Project } from '@/types/database'

export type ProjectDetail = Project & {
  factories: { name: string; code: string } | null
  assigned_pm: { full_name: string } | null
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.project(projectId),
    enabled: Boolean(projectId),
    queryFn: async (): Promise<ProjectDetail> => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('projects')
        .select(
          `
          *,
          factories (name, code),
          assigned_pm:profiles!assigned_pm_id (full_name)
        `,
        )
        .eq('id', projectId!)
        .single()

      if (error) {
        throw error
      }

      return data as unknown as ProjectDetail
    },
  })
}
