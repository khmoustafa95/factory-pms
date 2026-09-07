import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import {
  buildIlikeClause,
  buildIlikePattern,
  buildSearchOr,
  fetchPaginatedList,
} from '@/lib/list-query'
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
        const { data: projectHits, error: projectSearchError } = await supabase
          .from('projects')
          .select('id')
          .or(
            `${buildIlikeClause('title', searchPattern)},${buildIlikeClause('code', searchPattern)}`,
          )

        if (projectSearchError) {
          throw projectSearchError
        }

        query = query.or(
          buildSearchOr(['title', 'blocked_reason'], searchPattern, {
            column: 'project_id',
            ids: (projectHits ?? []).map((row) => row.id),
          }),
        )
      }

      if (params.factoryId !== 'all') {
        query = query.eq('projects.factory_id', params.factoryId)
      }

      if (params.escalationStatus === 'open') {
        query = query.or('escalation_status.is.null,escalation_status.eq.open')
      } else if (params.escalationStatus === 'acknowledged') {
        query = query.eq('escalation_status', 'acknowledged')
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
