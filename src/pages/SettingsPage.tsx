import { PageHeader } from '@/components/PageHeader'
import { GeneralSettingsForm } from '@/components/settings/GeneralSettingsForm'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTranslation } from '@/contexts/LocaleContext'

export function SettingsPage() {
  const { t, dir } = useTranslation()

  return (
    <section className="space-y-6">
      <PageHeader
        title={t('settings.title')}
        description={t('settings.description')}
      />

      <Tabs defaultValue="general" dir={dir}>
        <TabsList className="justify-start">
          <TabsTrigger value="general">{t('settings.generalTab')}</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="mt-6">
          <GeneralSettingsForm />
        </TabsContent>
      </Tabs>
    </section>
  )
}
