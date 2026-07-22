import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import { buildIlikePattern, fetchPaginatedList } from '@/lib/list-query'
import type { AccountsPageParams } from '@/lib/list-query-params'
import { applyActiveStatusFilter } from '@/lib/list-filters'
import { queryKeys } from '@/lib/query-keys'
import { joinMappers } from '@/lib/supabase-joins'
import type { ProfileWithFactory } from '@/types/joins'
import { PROFILE_WITH_FACTORY_SELECT } from '@/types/joins'
import type { AccountFormValues } from '@/lib/validations/account'

export type { ProfileWithFactory } from '@/types/joins'

export function useAccountsPage(params: AccountsPageParams) {
  return useQuery({
    queryKey: queryKeys.accountsPage(params),
    queryFn: async () => {
      const supabase = getSupabase()
      const searchPattern = buildIlikePattern(params.search)

      let query = supabase
        .from('profiles')
        .select(PROFILE_WITH_FACTORY_SELECT, { count: 'exact' })
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

      return fetchPaginatedList<ProfileWithFactory>({
        page: params.page,
        pageSize: params.pageSize,
        query,
        mapItems: joinMappers.profileWithFactory,
      })
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
