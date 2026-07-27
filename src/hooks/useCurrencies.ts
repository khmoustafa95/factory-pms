import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Currency, CurrencyInsert, CurrencyUpdate } from '@/types/database'

export function useCurrencies() {
  return useQuery({
    queryKey: queryKeys.currencies,
    enabled: isSupabaseConfigured(),
    queryFn: async (): Promise<Currency[]> => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('currencies')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('code', { ascending: true })

      if (error) throw error
      return data
    },
    staleTime: 5 * 60_000,
  })
}

export function useActiveCurrencies() {
  return useQuery({
    queryKey: [...queryKeys.currencies, 'active'] as const,
    enabled: isSupabaseConfigured(),
    queryFn: async (): Promise<Currency[]> => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('currencies')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('code', { ascending: true })

      if (error) throw error
      return data
    },
    staleTime: 5 * 60_000,
  })
}

export function useCreateCurrency() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: CurrencyInsert) => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('currencies')
        .insert(values)
        .select('*')
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.currencies })
    },
  })
}

export function useUpdateCurrency() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...values }: CurrencyUpdate & { id: string }) => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('currencies')
        .update(values)
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.currencies })
    },
  })
}

export function useDeleteCurrency() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabase()
      const { error } = await supabase.from('currencies').delete().eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.currencies })
    },
  })
}
