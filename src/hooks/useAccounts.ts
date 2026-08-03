import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import { buildIlikePattern, fetchPaginatedList } from '@/lib/list-query'
import type { AccountsPageParams } from '@/lib/list-query-params'
import { applyActiveStatusFilter } from '@/lib/list-filters'
import { queryKeys } from '@/lib/query-keys'
import { joinMappers } from '@/lib/supabase-joins'
import type { ProfileWithFactory } from '@/types/joins'
import { PROFILE_WITH_FACTORY_SELECT } from '@/types/joins'
import type {
  AccountCreateFormValues,
  AccountFormValues,
} from '@/lib/validations/account'

export type { ProfileWithFactory } from '@/types/joins'

export type ManageAccountResult = {
  user_id: string
  password: string
  email?: string
}

async function readFunctionsErrorMessage(
  error: unknown,
  fallback: string,
): Promise<string> {
  if (
    error &&
    typeof error === 'object' &&
    'context' in error &&
    error.context instanceof Response
  ) {
    try {
      const payload = (await error.context.clone().json()) as {
        error?: string
        message?: string
        msg?: string
      }
      const fromBody = payload.error ?? payload.message ?? payload.msg
      if (typeof fromBody === 'string' && fromBody.trim().length > 0) {
        return fromBody.trim()
      }
    } catch {
      // fall through
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim()
  }

  return fallback
}

async function invokeManageAccount(
  body: Record<string, unknown>,
): Promise<ManageAccountResult> {
  const supabase = getSupabase()

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session?.access_token) {
    throw new Error('Missing authorization. Sign in again and retry.')
  }

  const { data, error } = await supabase.functions.invoke('manage-account', {
    body,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (error) {
    throw new Error(await readFunctionsErrorMessage(error, 'Request failed'))
  }

  const result = data as ManageAccountResult | { error?: string } | null
  if (!result || typeof result !== 'object' || !('password' in result)) {
    throw new Error(
      result && 'error' in result && typeof result.error === 'string'
        ? result.error
        : 'Unexpected response',
    )
  }

  return result
}

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

export function useCreateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: AccountCreateFormValues) => {
      return invokeManageAccount({
        action: 'create',
        email: values.email,
        full_name: values.full_name,
        role: values.role,
        factory_id: values.factory_id,
        is_active: values.is_active,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.accounts })
      await queryClient.invalidateQueries({
        queryKey: ['factory-project-managers'],
      })
    },
  })
}

export function useResetAccountPassword() {
  return useMutation({
    mutationFn: async (userId: string) => {
      return invokeManageAccount({
        action: 'reset_password',
        user_id: userId,
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
