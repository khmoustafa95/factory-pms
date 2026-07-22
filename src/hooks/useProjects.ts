import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import {
  buildIlikePattern,
  getPaginationRange,
  type PaginatedResult,
} from '@/lib/list-query'
import type { ProjectsPageParams } from '@/lib/list-query-params'
import { queryKeys } from '@/lib/query-keys'
import type { Profile, Project, ProjectStatus } from '@/types/database'
import type { ProjectFormValues } from '@/lib/validations/project'
import { toProjectPayload } from '@/lib/validations/project'

export type ProjectListItem = Project & {
  factories: { name: string; code: string } | null
  proposer: { full_name: string } | null
  assigned_pm: { full_name: string } | null
}

const PROJECT_LIST_SELECT = `
  *,
  factories (name, code),
  proposer:profiles!proposed_by (full_name),
  assigned_pm:profiles!assigned_pm_id (full_name)
`

export function useProjectsPage(params: ProjectsPageParams) {
  return useQuery({
    queryKey: queryKeys.projectsPage(params),
    queryFn: async (): Promise<PaginatedResult<ProjectListItem>> => {
      const supabase = getSupabase()
      const { from, to } = getPaginationRange(params.page, params.pageSize)
      const searchPattern = buildIlikePattern(params.search)

      let query = supabase
        .from('projects')
        .select(PROJECT_LIST_SELECT, { count: 'exact' })
        .order('created_at', { ascending: false })

      if (searchPattern) {
        query = query.or(
          `title.ilike.${searchPattern},description.ilike.${searchPattern},factories.name.ilike.${searchPattern},factories.code.ilike.${searchPattern}`,
        )
      }

      if (params.status !== 'all') {
        query = query.eq('status', params.status as ProjectStatus)
      }

      if (params.factoryId !== 'all') {
        query = query.eq('factory_id', params.factoryId)
      }

      const { data, error, count } = await query.range(from, to)

      if (error) {
        throw error
      }

      return {
        items: (data ?? []) as unknown as ProjectListItem[],
        total: count ?? 0,
        page: params.page,
        pageSize: params.pageSize,
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
      status: Extract<ProjectStatus, 'draft' | 'proposed'>
    }) => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('projects')
        .insert({
          factory_id: factoryId,
          ...toProjectPayload(values),
          status,
          proposed_by: status === 'proposed' ? userId : null,
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
        .in('status', ['draft', 'rejected'])
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

export function useSubmitProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('projects')
        .update({
          status: 'proposed',
          proposed_by: userId,
          rejection_reason: null,
        })
        .eq('id', id)
        .in('status', ['draft', 'rejected'])
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

export function useApproveProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('projects')
        .update({
          status: 'approved',
          approved_by: userId,
          approved_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .eq('id', id)
        .eq('status', 'proposed')
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
      const { data, error } = await supabase
        .from('projects')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason.trim(),
          approved_by: null,
          approved_at: null,
        })
        .eq('id', id)
        .eq('status', 'proposed')
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
