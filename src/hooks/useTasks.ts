import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import { joinMappers } from '@/lib/supabase-joins'
import type { TaskListItem } from '@/types/joins'
import { TASK_LIST_SELECT } from '@/types/joins'
import { toTaskPayload, type TaskFormValues } from '@/lib/validations/task'
import type { TaskStatus } from '@/types/database'

export type { TaskListItem } from '@/types/joins'

async function invalidateTaskQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string | undefined,
  options?: { refreshEscalations?: boolean },
) {
  await queryClient.invalidateQueries({ queryKey: queryKeys.tasks(projectId) })
  await queryClient.invalidateQueries({
    queryKey: queryKeys.project(projectId),
  })
  await queryClient.invalidateQueries({ queryKey: queryKeys.projects })

  if (options?.refreshEscalations) {
    await queryClient.invalidateQueries({ queryKey: queryKeys.escalations })
  }
}

export function useTasks(projectId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.tasks(projectId),
    enabled: Boolean(projectId) && enabled,
    queryFn: async (): Promise<TaskListItem[]> => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('tasks')
        .select(TASK_LIST_SELECT)
        .eq('project_id', projectId!)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      return joinMappers.taskListItem(data)
    },
  })
}

async function getNextTaskSortOrder(phaseId: string): Promise<number> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('tasks')
    .select('sort_order')
    .eq('phase_id', phaseId)
    .order('sort_order', { ascending: false })
    .limit(1)

  if (error) {
    throw error
  }

  return (data[0]?.sort_order ?? -1) + 1
}

export function useCreateTask(projectId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      phaseId,
      values,
    }: {
      phaseId: string
      values: TaskFormValues
    }) => {
      if (!projectId) {
        throw new Error('Project is required')
      }

      const supabase = getSupabase()
      const sortOrder = await getNextTaskSortOrder(phaseId)

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          project_id: projectId,
          phase_id: phaseId,
          ...toTaskPayload(values),
          sort_order: sortOrder,
        })
        .select('*')
        .single()

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: async () => {
      await invalidateTaskQueries(queryClient, projectId, {
        refreshEscalations: true,
      })
    },
  })
}

export function useUpdateTask(projectId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string
      values: TaskFormValues
    }) => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('tasks')
        .update(toTaskPayload(values))
        .eq('id', id)
        .select('*')
        .single()

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: async () => {
      await invalidateTaskQueries(queryClient, projectId, {
        refreshEscalations: true,
      })
    },
  })
}

export function useUpdateTaskStatus(projectId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      status,
      blockedReason,
    }: {
      id: string
      status: TaskStatus
      blockedReason?: string
    }) => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('tasks')
        .update({
          status,
          blocked_reason:
            status === 'blocked' ? (blockedReason?.trim() ?? null) : null,
        })
        .eq('id', id)
        .select('*')
        .single()

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: async () => {
      await invalidateTaskQueries(queryClient, projectId, {
        refreshEscalations: true,
      })
    },
  })
}

export function useDeleteTask(projectId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabase()
      const { error } = await supabase.from('tasks').delete().eq('id', id)

      if (error) {
        throw error
      }
    },
    onSuccess: async () => {
      await invalidateTaskQueries(queryClient, projectId, {
        refreshEscalations: true,
      })
    },
  })
}
