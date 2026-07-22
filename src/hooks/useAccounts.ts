import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import {
  buildIlikePattern,
  getPaginationRange,
  type PaginatedResult,
} from '@/lib/list-query'
import type { AccountsPageParams } from '@/lib/list-query-params'
import { queryKeys } from '@/lib/query-keys'
import type { Profile } from '@/types/database'
import type { AccountFormValues } from '@/lib/validations/account'
import { applyActiveStatusFilter } from '@/lib/list-filters'

export type ProfileWithFactory = Profile & {
  factories: { name: string; code: string } | null
}

export function useAccountsPage(params: AccountsPageParams) {
  return useQuery({
    queryKey: queryKeys.accountsPage(params),
    queryFn: async (): Promise<PaginatedResult<ProfileWithFactory>> => {
      const supabase = getSupabase()
      const { from, to } = getPaginationRange(params.page, params.pageSize)
      const searchPattern = buildIlikePattern(params.search)

      let query = supabase
        .from('profiles')
        .select('*, factories(name, code)', { count: 'exact' })
        .order('full_name', { ascending: true })

      if (searchPattern) {
        query = query.or(
          `full_name.ilike.${searchPattern},email.ilike.${searchPattern}`,
        )
      }

      if (params.role !== 'all') {
        query = query.eq('role', params.role)
      }

      if (params.factoryId !== 'all') {
        query = query.eq('factory_id', params.factoryId)
      }

      query = applyActiveStatusFilter(query, params.status)

      const { data, error, count } = await query.range(from, to)

      if (error) {
        throw error
      }

      return {
        items: (data ?? []) as ProfileWithFactory[],
        total: count ?? 0,
        page: params.page,
        pageSize: params.pageSize,
      }
    },
  })
}

export function useUpdateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string
      values: AccountFormValues
    }) => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: values.full_name,
          role: values.role,
          factory_id:
            values.role === 'company_director' ? null : values.factory_id,
          is_active: values.is_active,
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.accounts })
    },
  })
}
