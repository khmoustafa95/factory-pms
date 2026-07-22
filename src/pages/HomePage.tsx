import { AppBrand } from '@/components/AppBrand'
import { useTranslation } from '@/contexts/LocaleContext'
import { isSupabaseConfigured } from '@/lib/supabase'

export function HomePage() {
  const { t } = useTranslation()
  const configured = isSupabaseConfigured()

  return (
    <section className="space-y-4">
      <AppBrand />
      <p className="max-w-xl text-muted-foreground">
        {t('settings.description')}
      </p>
      {!configured ? (
        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
          {t('auth.supabaseNotConfigured')}
        </p>
      ) : null}
    </section>
  )
}
