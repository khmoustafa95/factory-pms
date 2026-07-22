import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import {
  buildIlikePattern,
  getPaginationRange,
  type PaginatedResult,
} from '@/lib/list-query'
import type { EscalationsPageParams } from '@/lib/list-query-params'
import { queryKeys } from '@/lib/query-keys'
import { mapJoinRows } from '@/lib/supabase-joins'
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

const ESCALATION_SELECT = `
  *,
  projects (
    id,
    title,
    factory_id,
    factories (name, code)
  ),
  phases (name),
  assignee:profiles!assignee_id (full_name)
`

export function useEscalationsPage(params: EscalationsPageParams) {
  return useQuery({
    queryKey: queryKeys.escalationsPage(params),
    queryFn: async (): Promise<PaginatedResult<EscalationItem>> => {
      const supabase = getSupabase()
      const { from, to } = getPaginationRange(params.page, params.pageSize)
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

      const { data, error, count } = await query.range(from, to)

      if (error) {
        throw error
      }

      return {
        items: mapJoinRows<EscalationItem>(data),
        total: count ?? 0,
        page: params.page,
        pageSize: params.pageSize,
      }
    },
  })
}
