import type { Locale } from '@/i18n/types'
import type { AppSettings } from '@/types/database'

export const APP_SETTINGS_ID = 1
export const APP_LOGO_BUCKET = 'app-assets'
export const APP_LOGO_STORAGE_PATH = 'logo'

export const DEFAULT_APP_SETTINGS: Omit<
  AppSettings,
  'updated_at' | 'updated_by'
> = {
  id: APP_SETTINGS_ID,
  app_name_en: 'Projects System Management',
  app_name_ar: 'نظام إدارة المشاريع',
  app_short_name_en: 'PMS',
  app_short_name_ar: 'نظام المشاريع',
  logo_url: null,
  sign_in_description_en:
    'Projects System Management — factory leadership portal',
  sign_in_description_ar: 'نظام إدارة المشاريع — بوابة قيادة المصانع',
}

export type AppBranding = {
  name: string
  shortName: string
  signInDescription: string
  logoUrl: string | null
}

export function resolveAppBranding(
  settings: Pick<
    AppSettings,
    | 'app_name_en'
    | 'app_name_ar'
    | 'app_short_name_en'
    | 'app_short_name_ar'
    | 'logo_url'
    | 'sign_in_description_en'
    | 'sign_in_description_ar'
  >,
  locale: Locale,
): AppBranding {
  const isArabic = locale === 'ar'

  return {
    name: isArabic ? settings.app_name_ar : settings.app_name_en,
    shortName: isArabic
      ? settings.app_short_name_ar
      : settings.app_short_name_en,
    signInDescription: isArabic
      ? settings.sign_in_description_ar
      : settings.sign_in_description_en,
    logoUrl: settings.logo_url,
  }
}

export function applyBrandingToDocument(
  branding: AppBranding,
  options?: { logoUrl?: string | null },
) {
  document.title = branding.name

  const logoUrl = options?.logoUrl ?? branding.logoUrl
  if (!logoUrl) {
    return
  }

  let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!favicon) {
    favicon = document.createElement('link')
    favicon.rel = 'icon'
    document.head.appendChild(favicon)
  }

  favicon.href = logoUrl
}
