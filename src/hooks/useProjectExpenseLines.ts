import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getNextSortOrder,
  invalidateProjectFinanceQueries,
} from '@/lib/project-finance-queries'
import { queryKeys } from '@/lib/query-keys'
import { getSupabase } from '@/lib/supabase'
import type { ExpenseLineFormValues } from '@/lib/validations/expense-line'
import { toExpenseLinePayload } from '@/lib/validations/expense-line'
import type { ProjectExpenseLine } from '@/types/database'

export function useProjectExpenseLines(
  projectId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.projectExpenseLines(projectId),
    enabled: Boolean(projectId) && enabled,
    queryFn: async (): Promise<ProjectExpenseLine[]> => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('project_expense_lines')
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

export function useCreateProjectExpenseLine(projectId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: ExpenseLineFormValues) => {
      if (!projectId) {
        throw new Error('Project is required')
      }

      const supabase = getSupabase()
      const sortOrder = await getNextSortOrder(
        'project_expense_lines',
        projectId,
      )
      const { data, error } = await supabase
        .from('project_expense_lines')
        .insert({
          project_id: projectId,
          sort_order: sortOrder,
          ...toExpenseLinePayload(values),
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

export function useUpdateProjectExpenseLine(projectId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string
      values: ExpenseLineFormValues
    }) => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('project_expense_lines')
        .update(toExpenseLinePayload(values))
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

export function useDeleteProjectExpenseLine(projectId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabase()
      const { error } = await supabase
        .from('project_expense_lines')
        .delete()
        .eq('id', id)

      if (error) {
        throw error
      }
    },
    onSuccess: async () => {
      await invalidateProjectFinanceQueries(queryClient, projectId)
    },
  })
}
