import { AccountSettingsTab } from '@/components/settings/AccountSettingsTab'
import { CurrencySettingsTab } from '@/components/settings/CurrencySettingsTab'
import { GeneralSettingsForm } from '@/components/settings/GeneralSettingsForm'
import { PageHeader } from '@/components/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/contexts/LocaleContext'

export function SettingsPage() {
  const { t, dir } = useTranslation()
  const { profile } = useAuth()
  const isDirector = profile?.role === 'company_director'

  return (
    <section className="space-y-6">
      <PageHeader
        title={t('settings.title')}
        description={t('settings.description')}
      />

      <Tabs defaultValue="account" dir={dir}>
        <TabsList className="justify-start">
          <TabsTrigger value="account">{t('settings.accountTab')}</TabsTrigger>
          {isDirector ? (
            <>
              <TabsTrigger value="general">
                {t('settings.generalTab')}
              </TabsTrigger>
              <TabsTrigger value="currencies">
                {t('settings.currenciesTab')}
              </TabsTrigger>
            </>
          ) : null}
        </TabsList>
        <TabsContent value="account" className="mt-6">
          <AccountSettingsTab />
        </TabsContent>
        {isDirector ? (
          <>
            <TabsContent value="general" className="mt-6">
              <GeneralSettingsForm />
            </TabsContent>
            <TabsContent value="currencies" className="mt-6">
              <CurrencySettingsTab />
            </TabsContent>
          </>
        ) : null}
      </Tabs>
    </section>
  )
}
