import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  APP_LOGO_BUCKET,
  APP_LOGO_STORAGE_PATH,
  APP_SETTINGS_ID,
  DEFAULT_APP_SETTINGS,
} from '@/lib/app-settings'
import { queryKeys } from '@/lib/query-keys'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import type { AppSettings, AppSettingsUpdate } from '@/types/database'
import type { AppSettingsFormValues } from '@/lib/validations/app-settings'

function toAppSettings(row: AppSettings | null): AppSettings {
  if (!row) {
    return {
      ...DEFAULT_APP_SETTINGS,
      updated_at: new Date(0).toISOString(),
      updated_by: null,
    }
  }

  return row
}

export function useAppSettings() {
  return useQuery({
    queryKey: queryKeys.appSettings,
    enabled: isSupabaseConfigured(),
    queryFn: async (): Promise<AppSettings> => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', APP_SETTINGS_ID)
        .maybeSingle()

      if (error) {
        throw error
      }

      return toAppSettings(data)
    },
    staleTime: 5 * 60_000,
  })
}

async function uploadLogo(file: File): Promise<string> {
  const supabase = getSupabase()
  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  const path = `${APP_LOGO_STORAGE_PATH}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from(APP_LOGO_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: '3600',
    })

  if (uploadError) {
    throw uploadError
  }

  const { data } = supabase.storage.from(APP_LOGO_BUCKET).getPublicUrl(path)
  return `${data.publicUrl}?v=${Date.now()}`
}

export function useUpdateAppSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      values,
      userId,
    }: {
      values: AppSettingsFormValues
      userId: string
    }) => {
      const supabase = getSupabase()
      let logoUrl = values.logo_url ?? null

      if (values.logo_file) {
        logoUrl = await uploadLogo(values.logo_file)
      }

      const payload: AppSettingsUpdate = {
        app_name_en: values.app_name_en,
        app_name_ar: values.app_name_ar,
        app_short_name_en: values.app_short_name_en,
        app_short_name_ar: values.app_short_name_ar,
        sign_in_description_en: values.sign_in_description_en,
        sign_in_description_ar: values.sign_in_description_ar,
        logo_url: logoUrl,
        updated_by: userId,
      }

      const { data, error } = await supabase
        .from('app_settings')
        .update(payload)
        .eq('id', APP_SETTINGS_ID)
        .select('*')
        .single()

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.appSettings, data)
    },
  })
}

export function useRemoveAppLogo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const supabase = getSupabase()
      const { data: objects, error: listError } = await supabase.storage
        .from(APP_LOGO_BUCKET)
        .list('', { search: APP_LOGO_STORAGE_PATH })

      if (listError) {
        throw listError
      }

      if (objects && objects.length > 0) {
        const paths = objects.map((object) => object.name)
        const { error: removeError } = await supabase.storage
          .from(APP_LOGO_BUCKET)
          .remove(paths)

        if (removeError) {
          throw removeError
        }
      }

      const { data, error } = await supabase
        .from('app_settings')
        .update({ logo_url: null, updated_by: userId })
        .eq('id', APP_SETTINGS_ID)
        .select('*')
        .single()

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.appSettings, data)
    },
  })
}
