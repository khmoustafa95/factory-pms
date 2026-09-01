import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import {
  isProjectUuid,
  projectRouteKey,
  type ProjectRouteRef,
} from '@/lib/project-routes'
import { queryKeys } from '@/lib/query-keys'
import { joinMappers } from '@/lib/supabase-joins'
import type { ProjectDetail } from '@/types/joins'
import { PROJECT_DETAIL_SELECT } from '@/types/joins'

const PROJECT_DETAIL_SELECT_INNER = PROJECT_DETAIL_SELECT.replace(
  'factories (name, code)',
  'factories!inner(name, code)',
)

export type { ProjectDetail } from '@/types/joins'

export function useProject(routeRef: ProjectRouteRef | undefined) {
  return useQuery({
    queryKey: queryKeys.projectRoute(
      routeRef ? projectRouteKey(routeRef) : undefined,
    ),
    enabled: Boolean(routeRef),
    queryFn: async (): Promise<ProjectDetail> => {
      if (!routeRef) {
        throw new Error('Project route is required')
      }

      const supabase = getSupabase()
      const useInnerFactoryJoin = routeRef.kind === 'canonical'
      let query = supabase
        .from('projects')
        .select(
          useInnerFactoryJoin
            ? PROJECT_DETAIL_SELECT_INNER
            : PROJECT_DETAIL_SELECT,
        )

      if (routeRef.kind === 'canonical') {
        query = query
          .eq('code', routeRef.projectCode)
          .eq('factories.code', routeRef.factoryCode)
      } else if (isProjectUuid(routeRef.ref)) {
        query = query.eq('id', routeRef.ref)
      } else {
        query = query.eq('code', routeRef.ref)
      }

      const { data, error } = await query.single()

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
