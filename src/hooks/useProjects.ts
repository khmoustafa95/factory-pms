import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  ProjectUpsertKey,
  ProjectWritePayload,
} from '@/lib/import/projects-import'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import {
  buildIlikeClause,
  buildIlikePattern,
  buildProjectsSearchOr,
  fetchPaginatedList,
} from '@/lib/list-query'
import type { ProjectsPageParams } from '@/lib/list-query-params'
import { queryKeys } from '@/lib/query-keys'
import { joinMappers } from '@/lib/supabase-joins'
import type { ProjectListItem } from '@/types/joins'
import { PROJECT_LIST_SELECT } from '@/types/joins'
import type { Profile, ProjectStatus } from '@/types/database'
import type { ProjectFormValues } from '@/lib/validations/project'
import { toProjectPayload } from '@/lib/validations/project'

export type { ProjectListItem } from '@/types/joins'

async function fetchProjectsFinancialMap() {
  const supabase = getSupabase()
  const { data, error } = await supabase.rpc('get_projects_financial_summary')

  if (error) {
    throw error
  }

  return new Map(
    (data ?? []).map((row) => [
      row.project_id,
      {
        funding_received: Number(row.funding_received),
        budget_used_pct:
          row.budget_used_pct != null ? Number(row.budget_used_pct) : null,
        has_funding_gap: Boolean(row.has_funding_gap),
        open_procurement_count: Number(row.open_procurement_count),
        overdue_procurement_count: Number(row.overdue_procurement_count),
      },
    ]),
  )
}

export function useProjectsPage(params: ProjectsPageParams) {
  return useQuery({
    queryKey: queryKeys.projectsPage(params),
    queryFn: async () => {
      const supabase = getSupabase()
      const searchPattern = buildIlikePattern(params.search)

      let query = supabase
        .from('projects')
        .select(PROJECT_LIST_SELECT, { count: 'exact' })
        .order('created_at', { ascending: false })

      if (searchPattern) {
        const { data: factoryHits, error: factorySearchError } = await supabase
          .from('factories')
          .select('id')
          .or(
            `${buildIlikeClause('name', searchPattern)},${buildIlikeClause('code', searchPattern)}`,
          )

        if (factorySearchError) {
          throw factorySearchError
        }

        query = query.or(
          buildProjectsSearchOr(
            searchPattern,
            (factoryHits ?? []).map((row) => row.id),
          ),
        )
      }

      if (params.status !== 'all') {
        query = query.eq('status', params.status as ProjectStatus)
      }

      if (params.factoryId !== 'all') {
        query = query.eq('factory_id', params.factoryId)
      }

      const [pageResult, financialMap] = await Promise.all([
        fetchPaginatedList<ProjectListItem>({
          page: params.page,
          pageSize: params.pageSize,
          query,
          mapItems: joinMappers.projectListItem,
        }),
        fetchProjectsFinancialMap(),
      ])

      return {
        ...pageResult,
        items: pageResult.items.map((item) => {
          const financials = financialMap.get(item.id)
          return financials ? { ...item, ...financials } : item
        }),
      }
    },
  })
}

export function useFactoryProjectManagers(
  factoryId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.factoryProjectManagers(factoryId),
    enabled: Boolean(factoryId),
    queryFn: async (): Promise<
      Pick<Profile, 'id' | 'full_name' | 'email'>[]
    > => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('factory_id', factoryId!)
        .eq('role', 'project_manager')
        .eq('is_active', true)
        .order('full_name', { ascending: true })

      if (error) {
        throw error
      }

      return data
    },
  })
}

export type CommandProjectHit = {
  id: string
  title: string
  status: ProjectStatus
  code: string
  factories: { code: string } | null
}

export function useCommandProjectSearch(search: string, enabled: boolean) {
  const pattern = buildIlikePattern(search)

  return useQuery({
    queryKey: queryKeys.commandProjects(search.trim()),
    enabled: enabled && Boolean(pattern) && isSupabaseConfigured(),
    queryFn: async (): Promise<CommandProjectHit[]> => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, status, code, factories (code)')
        .or(
          `title.ilike.${pattern},description.ilike.${pattern},code.ilike.${pattern}`,
        )
        .order('updated_at', { ascending: false })
        .limit(8)

      if (error) {
        throw error
      }

      return data
    },
  })
}

async function fetchAllProjectUpsertKeys(): Promise<ProjectUpsertKey[]> {
  const supabase = getSupabase()
  const pageSize = 1000
  const rows: ProjectUpsertKey[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('projects')
      .select('factory_id, code')
      .range(from, from + pageSize - 1)

    if (error) {
      throw error
    }

    const page = data ?? []
    rows.push(...page)
    if (page.length < pageSize) {
      break
    }
    from += pageSize
  }

  return rows
}

export function useProjectUpsertKeys(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.projectUpsertKeys,
    enabled,
    queryFn: fetchAllProjectUpsertKeys,
  })
}

export function useUpsertProjects() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      payloads,
      userId,
    }: {
      payloads: ProjectWritePayload[]
      userId: string
    }) => {
      const supabase = getSupabase()
      const existing = await fetchAllProjectUpsertKeys()
      const existingKeys = new Set(
        existing.map(
          (key) => `${key.factory_id}:${key.code.trim().toUpperCase()}`,
        ),
      )

      const toInsert = payloads.filter(
        (payload) =>
          !existingKeys.has(
            `${payload.factory_id}:${payload.code.trim().toUpperCase()}`,
          ),
      )
      const toUpdate = payloads.filter((payload) =>
        existingKeys.has(
          `${payload.factory_id}:${payload.code.trim().toUpperCase()}`,
        ),
      )

      const results: Array<{
        id: string
        factory_id: string
        code: string
        proposed_by: string | null
      }> = []

      if (toInsert.length > 0) {
        const { data, error } = await supabase
          .from('projects')
          .insert(
            toInsert.map((payload) => ({
              ...payload,
              status: 'consultation' as const,
              proposed_by: userId,
            })),
          )
          .select('id, factory_id, code, proposed_by')

        if (error) {
          throw error
        }

        results.push(...(data ?? []))
      }

      if (toUpdate.length > 0) {
        const { data, error } = await supabase
          .from('projects')
          .upsert(toUpdate, { onConflict: 'factory_id,code' })
          .select('id, factory_id, code, proposed_by')

        if (error) {
          throw error
        }

        results.push(...(data ?? []))
      }

      return results
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projectUpsertKeys,
      })
    },
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      factoryId,
      userId,
      values,
      status,
    }: {
      factoryId: string
      userId: string
      values: ProjectFormValues
      status: Extract<ProjectStatus, 'draft' | 'consultation'>
    }) => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('projects')
        .insert({
          factory_id: factoryId,
          ...toProjectPayload(values),
          status,
          proposed_by: status === 'consultation' ? userId : null,
        })
        .select('*')
        .single()

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects })
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string
      values: ProjectFormValues
    }) => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('projects')
        .update(toProjectPayload(values))
        .eq('id', id)
        .in('status', [
          'draft',
          'proposed',
          'approved',
          'rejected',
          'in_progress',
          'paused',
        ])
        .select('*')
        .single()

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.project(data.id),
      })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projectStatusTransitions(data.id),
      })
    },
  })
}

export function useSetProjectSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      startDate,
      endDate,
    }: {
      id: string
      startDate: string
      endDate: string
    }) => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('projects')
        .update({
          proposed_start_date: startDate,
          proposed_end_date: endDate,
        })
        .eq('id', id)
        .eq('status', 'approved')
        .select('*')
        .single()

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.project(data.id),
      })
    },
  })
}

export function useSubmitProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: { id: string; userId: string }) => {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('transition_project_status', {
        p_project_id: id,
        p_target_status: 'consultation',
      })

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects })
    },
  })
}

export function useCompleteConsultation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('transition_project_status', {
        p_project_id: id,
        p_target_status: 'proposed',
      })

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.project(data.id),
      })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projectStatusTransitions(data.id),
      })
    },
  })
}

export function useUpdateConsultationOpinions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      researchOpinion,
      boardOpinion,
    }: {
      id: string
      researchOpinion: string
      boardOpinion: string
    }) => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('projects')
        .update({
          research_opinion: researchOpinion.trim(),
          board_opinion: boardOpinion.trim(),
        })
        .eq('id', id)
        .eq('status', 'consultation')
        .select('*')
        .single()

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.project(data.id),
      })
    },
  })
}

export function useApproveProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: { id: string; userId: string }) => {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('transition_project_status', {
        p_project_id: id,
        p_target_status: 'approved',
      })

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.project(data.id),
      })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projectStatusTransitions(data.id),
      })
    },
  })
}

export function useRejectProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      rejectionReason,
    }: {
      id: string
      rejectionReason: string
    }) => {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('transition_project_status', {
        p_project_id: id,
        p_target_status: 'rejected',
        p_reason: rejectionReason.trim(),
      })

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.project(data.id),
      })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projectStatusTransitions(data.id),
      })
    },
  })
}

export function useStartProjectExecution() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('transition_project_status', {
        p_project_id: id,
        p_target_status: 'in_progress',
      })

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.project(data.id),
      })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projectStatusTransitions(data.id),
      })
    },
  })
}

export function usePauseProjectExecution() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('transition_project_status', {
        p_project_id: id,
        p_target_status: 'paused',
        p_reason: reason.trim(),
      })

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.project(data.id),
      })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projectStatusTransitions(data.id),
      })
    },
  })
}

export function useResumeProjectExecution() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('transition_project_status', {
        p_project_id: id,
        p_target_status: 'in_progress',
      })

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.project(data.id),
      })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projectStatusTransitions(data.id),
      })
    },
  })
}

export function useCompleteProjectExecution() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('transition_project_status', {
        p_project_id: id,
        p_target_status: 'completed',
      })

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.project(data.id),
      })
    },
  })
}
