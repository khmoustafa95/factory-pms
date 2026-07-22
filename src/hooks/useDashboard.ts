import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'

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
      const { data, error } = await supabase.rpc('get_dashboard_stats')

      if (error) {
        throw error
      }

      const row = data?.[0]
      if (!row) {
        return {
          factoryCount: 0,
          activeProjectCount: 0,
          averageProgress: 0,
          blockedTaskCount: 0,
        }
      }

      return {
        factoryCount: Number(row.factory_count),
        activeProjectCount: Number(row.active_project_count),
        averageProgress: Number(row.average_progress),
        blockedTaskCount: Number(row.blocked_task_count),
      }
    },
  })
}
