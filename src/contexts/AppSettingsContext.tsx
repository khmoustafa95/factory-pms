import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'
import { useLocale } from '@/contexts/LocaleContext'
import {
  applyBrandingToDocument,
  DEFAULT_APP_SETTINGS,
  resolveAppBranding,
  type AppBranding,
} from '@/lib/app-settings'
import { useAppSettings } from '@/hooks/useAppSettings'
import type { AppSettings } from '@/types/database'

interface AppSettingsContextValue {
  settings: AppSettings
  branding: AppBranding
  isLoading: boolean
  isConfigured: boolean
}

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null)

const fallbackSettings: AppSettings = {
  ...DEFAULT_APP_SETTINGS,
  updated_at: new Date(0).toISOString(),
  updated_by: null,
}

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale()
  const { data, isLoading, isError } = useAppSettings()

  const settings = data ?? fallbackSettings
  const branding = useMemo(
    () => resolveAppBranding(settings, locale),
    [locale, settings],
  )

  useEffect(() => {
    applyBrandingToDocument(branding)
  }, [branding])

  const value = useMemo(
    () => ({
      settings,
      branding,
      isLoading,
      isConfigured: !isError && Boolean(data),
    }),
    [branding, data, isError, isLoading, settings],
  )

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  )
}

export function useAppBranding() {
  const context = useContext(AppSettingsContext)
  if (!context) {
    throw new Error('useAppBranding must be used within AppSettingsProvider')
  }
  return context
}
