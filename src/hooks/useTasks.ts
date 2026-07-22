import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import type { Task } from '@/types/database'
import { toTaskPayload, type TaskFormValues } from '@/lib/validations/task'

export type TaskListItem = Task & {
  assignee: { full_name: string } | null
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

      return data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.tasks(projectId),
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
      await queryClient.invalidateQueries({
        queryKey: queryKeys.tasks(projectId),
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
      await queryClient.invalidateQueries({
        queryKey: queryKeys.tasks(projectId),
      })
    },
  })
}
