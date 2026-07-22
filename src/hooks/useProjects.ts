import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import type { Profile, Project, ProjectStatus } from '@/types/database'
import type { ProjectFormValues } from '@/lib/validations/project'
import { toProjectPayload } from '@/lib/validations/project'

export type ProjectListItem = Project & {
  factories: { name: string; code: string } | null
  proposer: { full_name: string } | null
  assigned_pm: { full_name: string } | null
}

export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: async (): Promise<ProjectListItem[]> => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('projects')
        .select(
          `
          *,
          factories (name, code),
          proposer:profiles!proposed_by (full_name),
          assigned_pm:profiles!assigned_pm_id (full_name)
        `,
        )
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return data as unknown as ProjectListItem[]
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
