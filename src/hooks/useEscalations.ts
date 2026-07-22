import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import type { Task } from '@/types/database'

export type EscalationItem = Task & {
  projects: {
    id: string
    title: string
    factory_id: string
    factories: { name: string; code: string } | null
  } | null
  phases: { name: string } | null
  assignee: { full_name: string } | null
}

export function useEscalations() {
  return useQuery({
    queryKey: queryKeys.escalations,
    queryFn: async (): Promise<EscalationItem[]> => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('tasks')
        .select(
          `
          *,
          projects (
            id,
            title,
            factory_id,
            factories (name, code)
          ),
          phases (name),
          assignee:profiles!assignee_id (full_name)
        `,
        )
        .eq('status', 'blocked')
        .order('updated_at', { ascending: false })

      if (error) {
        throw error
      }

      return data as unknown as EscalationItem[]
    },
  })
}

export type DashboardStats = {
  factoryCount: number
  activeProjectCount: number
  averageProgress: number
  blockedTaskCount: number
}

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async (): Promise<DashboardStats> => {
      const supabase = getSupabase()

      const [factoriesResult, projectsResult, blockedResult] =
        await Promise.all([
          supabase
            .from('factories')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true),
          supabase
            .from('projects')
            .select('progress_percent, status')
            .in('status', ['approved', 'in_progress', 'paused']),
          supabase
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'blocked'),
        ])

      if (factoriesResult.error) {
        throw factoriesResult.error
      }
      if (projectsResult.error) {
        throw projectsResult.error
      }
      if (blockedResult.error) {
        throw blockedResult.error
      }

      const projects = projectsResult.data ?? []
      const averageProgress =
        projects.length > 0
          ? projects.reduce(
              (sum, project) => sum + Number(project.progress_percent),
              0,
            ) / projects.length
          : 0

      return {
        factoryCount: factoriesResult.count ?? 0,
        activeProjectCount: projects.length,
        averageProgress,
        blockedTaskCount: blockedResult.count ?? 0,
      }
    },
  })
}
