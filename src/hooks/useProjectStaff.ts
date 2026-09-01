import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getNextSortOrder,
  invalidateProjectFinanceQueries,
} from '@/lib/project-finance-queries'
import { queryKeys } from '@/lib/query-keys'
import { getSupabase } from '@/lib/supabase'
import type { StaffFormValues } from '@/lib/validations/staff'
import { toStaffPayload } from '@/lib/validations/staff'
import type { ProjectStaff } from '@/types/database'

export function useProjectStaff(
  projectId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.projectStaff(projectId),
    enabled: Boolean(projectId) && enabled,
    queryFn: async (): Promise<ProjectStaff[]> => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('project_staff')
        .select('*')
        .eq('project_id', projectId!)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      return data
    },
  })
}

export function useCreateProjectStaff(projectId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: StaffFormValues) => {
      if (!projectId) {
        throw new Error('Project is required')
      }

      const supabase = getSupabase()
      const sortOrder = await getNextSortOrder('project_staff', projectId)
      const { data, error } = await supabase
        .from('project_staff')
        .insert({
          project_id: projectId,
          sort_order: sortOrder,
          ...toStaffPayload(values),
        })
        .select('*')
        .single()

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: async () => {
      await invalidateProjectFinanceQueries(queryClient, projectId)
    },
  })
}

export function useUpdateProjectStaff(projectId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string
      values: StaffFormValues
    }) => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('project_staff')
        .update(toStaffPayload(values))
        .eq('id', id)
        .select('*')
        .single()

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: async () => {
      await invalidateProjectFinanceQueries(queryClient, projectId)
    },
  })
}

export function useDeleteProjectStaff(projectId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabase()
      const { error } = await supabase.from('project_staff').delete().eq('id', id)

      if (error) {
        throw error
      }
    },
    onSuccess: async () => {
      await invalidateProjectFinanceQueries(queryClient, projectId)
    },
  })
}

export function sumStaffHeadcount(staff: ProjectStaff[]): number {
  return staff.reduce((sum, member) => sum + member.headcount, 0)
}
