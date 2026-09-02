import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { getSupabase } from '@/lib/supabase'
import type {
  ChangeRequestKind,
  ProjectChangeRequest,
} from '@/types/database'

async function invalidateProject(queryClient: ReturnType<typeof useQueryClient>, projectId: string) {
  await queryClient.invalidateQueries({ queryKey: queryKeys.projects })
  await queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) })
  await queryClient.invalidateQueries({
    queryKey: queryKeys.projectChangeRequests(projectId),
  })
  await queryClient.invalidateQueries({
    queryKey: queryKeys.projectStatusTransitions(projectId),
  })
}

export function useProjectChangeRequests(
  projectId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.projectChangeRequests(projectId),
    enabled: Boolean(projectId) && enabled,
    queryFn: async (): Promise<ProjectChangeRequest[]> => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('project_change_requests')
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return data ?? []
    },
  })
}

export function useRequestProjectCompletion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('request_project_completion', {
        p_project_id: id,
      })

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: async (data) => {
      await invalidateProject(queryClient, data.id)
    },
  })
}

export function useRequestProjectChange(projectId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      kind,
      reason,
      requestedBudget,
      requestedStartDate,
      requestedEndDate,
    }: {
      kind: ChangeRequestKind
      reason: string
      requestedBudget?: number
      requestedStartDate?: string
      requestedEndDate?: string
    }) => {
      if (!projectId) {
        throw new Error('Project is required')
      }

      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('request_project_change', {
        p_project_id: projectId,
        p_change_kind: kind,
        p_reason: reason,
        p_requested_budget: requestedBudget,
        p_requested_start_date: requestedStartDate,
        p_requested_end_date: requestedEndDate,
      })

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: async () => {
      if (projectId) {
        await invalidateProject(queryClient, projectId)
      }
    },
  })
}

export function useReviewProjectChange(projectId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      requestId,
      approve,
      reason,
    }: {
      requestId: string
      approve: boolean
      reason?: string
    }) => {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('review_project_change', {
        p_request_id: requestId,
        p_approve: approve,
        p_reason: reason,
      })

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: async () => {
      if (projectId) {
        await invalidateProject(queryClient, projectId)
      }
    },
  })
}

export function useReassignProjectPm() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      pmId,
      reason,
    }: {
      id: string
      pmId: string
      reason: string
    }) => {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('reassign_project_pm', {
        p_project_id: id,
        p_pm_id: pmId,
        p_reason: reason,
      })

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: async (data) => {
      await invalidateProject(queryClient, data.id)
    },
  })
}

export function useAcknowledgeTaskEscalation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId }: { taskId: string }) => {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc(
        'acknowledge_task_escalation',
        { p_task_id: taskId },
      )

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.escalations })
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks(data.project_id) })
    },
  })
}
