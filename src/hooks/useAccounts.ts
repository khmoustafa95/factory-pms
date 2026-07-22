import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import type { Profile } from '@/types/database'
import type { AccountFormValues } from '@/lib/validations/account'

type ProfileWithFactory = Profile & {
  factories: { name: string; code: string } | null
}

export function useAccounts() {
  return useQuery({
    queryKey: queryKeys.accounts,
    queryFn: async (): Promise<ProfileWithFactory[]> => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('profiles')
        .select('*, factories(name, code)')
        .order('full_name', { ascending: true })

      if (error) {
        throw error
      }

      return data as ProfileWithFactory[]
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
