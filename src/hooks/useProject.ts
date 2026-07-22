import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import { joinMappers } from '@/lib/supabase-joins'
import type { ProjectDetail } from '@/types/joins'
import { PROJECT_DETAIL_SELECT } from '@/types/joins'

export type { ProjectDetail } from '@/types/joins'

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.project(projectId),
    enabled: Boolean(projectId),
    queryFn: async (): Promise<ProjectDetail> => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('projects')
        .select(PROJECT_DETAIL_SELECT)
        .eq('id', projectId!)
        .single()

      if (error) {
        throw error
      }

      const project = joinMappers.projectDetail(data)
      if (!project) {
        throw new Error('Project not found')
      }

      return project
    },
  })
}
