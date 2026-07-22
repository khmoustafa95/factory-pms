import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import type { Factory } from '@/types/database'
import type { FactoryFormValues } from '@/lib/validations/factory'

export function useFactories() {
  return useQuery({
    queryKey: queryKeys.factories,
    queryFn: async (): Promise<Factory[]> => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('factories')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        throw error
      }

      return data
    },
  })
}

export function useCreateFactory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: FactoryFormValues) => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('factories')
        .insert({
          name: values.name,
          code: values.code.toUpperCase(),
          location: values.location || null,
          is_active: values.is_active,
        })
        .select('*')
        .single()

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.factories })
    },
  })
}

export function useUpdateFactory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string
      values: FactoryFormValues
    }) => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('factories')
        .update({
          name: values.name,
          code: values.code.toUpperCase(),
          location: values.location || null,
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.factories })
    },
  })
}
