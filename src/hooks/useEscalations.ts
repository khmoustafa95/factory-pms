import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import { buildIlikePattern, fetchPaginatedList } from '@/lib/list-query'
import type { EscalationsPageParams } from '@/lib/list-query-params'
import { queryKeys } from '@/lib/query-keys'
import { joinMappers } from '@/lib/supabase-joins'
import type { EscalationItem } from '@/types/joins'
import { ESCALATION_SELECT } from '@/types/joins'

export type { EscalationItem } from '@/types/joins'

export function useEscalationsPage(params: EscalationsPageParams) {
  return useQuery({
    queryKey: queryKeys.escalationsPage(params),
    queryFn: async () => {
      const supabase = getSupabase()
      const searchPattern = buildIlikePattern(params.search)
      const useInnerProjectJoin = params.factoryId !== 'all'

      let query = supabase
        .from('tasks')
        .select(
          useInnerProjectJoin
            ? ESCALATION_SELECT.replace('projects (', 'projects!inner (')
            : ESCALATION_SELECT,
          { count: 'exact' },
        )
        .eq('status', 'blocked')
        .order('updated_at', { ascending: false })

      if (searchPattern) {
        query = query.or(
          `title.ilike.${searchPattern},blocked_reason.ilike.${searchPattern},projects.title.ilike.${searchPattern}`,
        )
      }

      if (params.factoryId !== 'all') {
        query = query.eq('projects.factory_id', params.factoryId)
      }

      return fetchPaginatedList<EscalationItem>({
        page: params.page,
        pageSize: params.pageSize,
        query,
        mapItems: joinMappers.escalationItem,
      })
    },
  })
}
