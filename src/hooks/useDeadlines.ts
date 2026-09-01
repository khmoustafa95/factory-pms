import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import type { CalendarDeadline } from '@/types/database'

export function useCalendarDeadlines(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.calendarDeadlines(from, to),
    enabled: enabled && isSupabaseConfigured(),
    queryFn: async (): Promise<CalendarDeadline[]> => {
      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('get_calendar_deadlines', {
        p_from: from,
        p_to: to,
      })

      if (error) {
        throw error
      }

      return data ?? []
    },
  })
}
