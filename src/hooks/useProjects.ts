import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import { buildIlikePattern, fetchPaginatedList } from '@/lib/list-query'
import type { ProjectsPageParams } from '@/lib/list-query-params'
import { queryKeys } from '@/lib/query-keys'
import { joinMappers } from '@/lib/supabase-joins'
import type { ProjectListItem } from '@/types/joins'
import { PROJECT_LIST_SELECT } from '@/types/joins'
import type { Profile, ProjectStatus } from '@/types/database'
import type { ProjectFormValues } from '@/lib/validations/project'
import { toProjectPayload } from '@/lib/validations/project'

export type { ProjectListItem } from '@/types/joins'

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

      return fetchPaginatedList<ProjectListItem>({
        page: params.page,
        pageSize: params.pageSize,
        query,
        mapItems: joinMappers.projectListItem,
      })
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
        .select('id, title, status')
        .or(`title.ilike.${pattern},description.ilike.${pattern}`)
        .order('updated_at', { ascending: false })
        .limit(8)

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

export function useSubmitProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: { id: string; userId: string }) => {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('transition_project_status', {
        p_project_id: id,
        p_target_status: 'proposed',
        p_reason: null,
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

export function useApproveProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: { id: string; userId: string }) => {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('transition_project_status', {
        p_project_id: id,
        p_target_status: 'approved',
        p_reason: null,
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
        p_reason: null,
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
        p_reason: null,
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
        p_reason: null,
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
