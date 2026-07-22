import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import { calculateProjectProgress } from '@/lib/progress'
import { toTaskPayload, type TaskFormValues } from '@/lib/validations/task'
import type { Task, TaskStatus } from '@/types/database'

export type TaskListItem = Task & {
  assignee: { full_name: string } | null
}

async function syncProjectProgress(projectId: string) {
  const supabase = getSupabase()

  const [
    { data: phases, error: phasesError },
    { data: tasks, error: tasksError },
  ] = await Promise.all([
    supabase.from('phases').select('*').eq('project_id', projectId),
    supabase.from('tasks').select('*').eq('project_id', projectId),
  ])

  if (phasesError) {
    throw phasesError
  }
  if (tasksError) {
    throw tasksError
  }

  const progress = calculateProjectProgress(phases ?? [], tasks ?? [])

  const { error: updateError } = await supabase
    .from('projects')
    .update({ progress_percent: Number(progress.toFixed(2)) })
    .eq('id', projectId)

  if (updateError) {
    throw updateError
  }
}

async function invalidateTaskQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string | undefined,
) {
  await queryClient.invalidateQueries({ queryKey: queryKeys.tasks(projectId) })
  await queryClient.invalidateQueries({
    queryKey: queryKeys.project(projectId),
  })
  await queryClient.invalidateQueries({ queryKey: queryKeys.projects })
  await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
  await queryClient.invalidateQueries({ queryKey: queryKeys.escalations })
}

export function useTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tasks(projectId),
    enabled: Boolean(projectId),
    queryFn: async (): Promise<TaskListItem[]> => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('tasks')
        .select(
          `
          *,
          assignee:profiles!assignee_id (full_name)
        `,
        )
        .eq('project_id', projectId!)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      return data as unknown as TaskListItem[]
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

      await syncProjectProgress(projectId)
      return data
    },
    onSuccess: async () => {
      await invalidateTaskQueries(queryClient, projectId)
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

      if (projectId) {
        await syncProjectProgress(projectId)
      }

      return data
    },
    onSuccess: async () => {
      await invalidateTaskQueries(queryClient, projectId)
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

      if (projectId) {
        await syncProjectProgress(projectId)
      }

      return data
    },
    onSuccess: async () => {
      await invalidateTaskQueries(queryClient, projectId)
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

      if (projectId) {
        await syncProjectProgress(projectId)
      }
    },
    onSuccess: async () => {
      await invalidateTaskQueries(queryClient, projectId)
    },
  })
}
