import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { getSupabase } from '@/lib/supabase'

export async function invalidateProjectFinanceQueries(
  queryClient: QueryClient,
  projectId: string | undefined,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.projectFunding(projectId),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.projectProcurement(projectId),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.projectStaff(projectId),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.projectExpenseLines(projectId),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.projectFinancialSnapshot(projectId),
    }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboardInsights }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboardProjects }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.projectsFinancialSummary,
    }),
  ])
}

export async function getNextSortOrder(
  table:
    | 'project_procurement_items'
    | 'project_staff'
    | 'project_expense_lines',
  projectId: string,
): Promise<number> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from(table)
    .select('sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: false })
    .limit(1)

  if (error) {
    throw error
  }

  return (data[0]?.sort_order ?? -1) + 1
}
