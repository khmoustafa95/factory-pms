import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createTranslator } from '@/i18n/translate'
import {
  LOCALES,
  translations,
  type Locale,
  type TranslationParams,
} from '@/i18n/types'

const LOCALE_STORAGE_KEY = 'pms-locale'

type TranslateFn = (key: string, params?: TranslationParams) => string

interface LocaleContextValue {
  locale: Locale
  dir: 'ltr' | 'rtl'
  setLocale: (locale: Locale) => void
  t: TranslateFn
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function readStoredLocale(): Locale {
  if (typeof window === 'undefined') {
    return 'en'
  }

  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
  if (stored === 'en' || stored === 'ar') {
    return stored
  }

  const browserLang = window.navigator.language.toLowerCase()
  return browserLang.startsWith('ar') ? 'ar' : 'en'
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale)

  const dir = LOCALES.find((item) => item.code === locale)?.dir ?? 'ltr'

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale)
    window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale)
  }, [])

  const t = useMemo(() => createTranslator(translations[locale]), [locale])

  useLayoutEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = dir
  }, [dir, locale])

  const value = useMemo(
    () => ({ locale, dir, setLocale, t }),
    [dir, locale, setLocale, t],
  )

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  )
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider')
  }
  return context
}

export function useTranslation() {
  const { t, locale, dir, setLocale } = useLocale()
  return { t, locale, dir, setLocale }
}
