import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { queryKeys } from '@/lib/query-keys'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import type { AppNotification } from '@/types/database'

const NOTIFICATIONS_LIMIT = 50

function uniqueChannelName(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

export function useNotifications() {
  const { user } = useAuth()
  const userId = user?.id

  return useQuery({
    queryKey: queryKeys.notifications(userId),
    enabled: Boolean(userId) && isSupabaseConfigured(),
    queryFn: async (): Promise<AppNotification[]> => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(NOTIFICATIONS_LIMIT)

      if (error) {
        throw error
      }

      return data
    },
  })
}

export function useNotificationsRealtime(enabled = true) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id

  useEffect(() => {
    if (!userId || !enabled || !isSupabaseConfigured()) {
      return
    }

    const supabase = getSupabase()
    const channel = supabase
      .channel(uniqueChannelName(`notifications-${userId}`))
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.notifications(userId),
          })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [enabled, queryClient, userId])
}

export function useMarkNotificationRead() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const supabase = getSupabase()
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', userId!)

      if (error) {
        throw error
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notifications(userId),
      })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id

  return useMutation({
    mutationFn: async () => {
      const supabase = getSupabase()
      const { error } = await supabase.rpc('mark_all_notifications_read')

      if (error) {
        throw error
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notifications(userId),
      })
    },
  })
}
