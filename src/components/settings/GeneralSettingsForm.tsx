import { zodResolver } from '@hookform/resolvers/zod'
import { ImageIcon, Trash2 } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/contexts/LocaleContext'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  useAppSettings,
  useRemoveAppLogo,
  useUpdateAppSettings,
} from '@/hooks/useAppSettings'
import { useValidationSchema } from '@/hooks/useValidationSchema'
import {
  ALLOWED_LOGO_TYPES,
  createAppSettingsFormSchema,
  type AppSettingsFormValues,
} from '@/lib/validations/app-settings'

export function GeneralSettingsForm() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { data: settings, isLoading } = useAppSettings()
  const updateSettings = useUpdateAppSettings()
  const removeLogo = useRemoveAppLogo()
  const appSettingsSchema = useValidationSchema(createAppSettingsFormSchema)

  const form = useForm<AppSettingsFormValues>({
    resolver: zodResolver(appSettingsSchema),
    defaultValues: {
      app_name_en: '',
      app_name_ar: '',
      app_short_name_en: '',
      app_short_name_ar: '',
      sign_in_description_en: '',
      sign_in_description_ar: '',
      logo_url: null,
    },
  })

  const logoUrl = useWatch({ control: form.control, name: 'logo_url' })
  const logoFile = useWatch({ control: form.control, name: 'logo_file' })
  const filePreview = useMemo(
    () => (logoFile ? URL.createObjectURL(logoFile) : null),
    [logoFile],
  )
  const logoPreview = filePreview ?? logoUrl

  useEffect(() => {
    if (!settings) {
      return
    }

    form.reset({
      app_name_en: settings.app_name_en,
      app_name_ar: settings.app_name_ar,
      app_short_name_en: settings.app_short_name_en,
      app_short_name_ar: settings.app_short_name_ar,
      sign_in_description_en: settings.sign_in_description_en,
      sign_in_description_ar: settings.sign_in_description_ar,
      logo_url: settings.logo_url,
      logo_file: undefined,
    })
  }, [form, settings])

  useEffect(() => {
    return () => {
      if (filePreview) {
        URL.revokeObjectURL(filePreview)
      }
    }
  }, [filePreview])

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    form.setValue('logo_file', file, { shouldDirty: true })
  }

  const handleRemoveLogo = async () => {
    if (!user) {
      return
    }

    try {
      await removeLogo.mutateAsync({ userId: user.id })
      form.setValue('logo_file', undefined)
      form.setValue('logo_url', null, { shouldDirty: false })
      toast.success(t('settings.logoRemoved'))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('settings.saveFailed')
      toast.error(message)
    }
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (!user) {
      return
    }

    try {
      await updateSettings.mutateAsync({ values, userId: user.id })
      form.setValue('logo_file', undefined)
      toast.success(t('settings.saved'))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('settings.saveFailed')
      toast.error(message)
    }
  })

  if (isLoading || !settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.generalTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </CardContent>
      </Card>
    )
  }

  const isSaving = updateSettings.isPending || removeLogo.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.generalTitle')}</CardTitle>
        <CardDescription>{t('settings.generalDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-8" onSubmit={onSubmit}>
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-medium">{t('settings.logo')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('settings.logoHelp')}
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex size-24 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt=""
                    className="max-h-20 max-w-20 object-contain"
                  />
                ) : (
                  <ImageIcon className="size-8 text-muted-foreground" />
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button asChild type="button" variant="outline" size="sm">
                  <label>
                    {t('settings.uploadLogo')}
                    <input
                      type="file"
                      accept={ALLOWED_LOGO_TYPES.join(',')}
                      className="sr-only"
                      onChange={handleLogoChange}
                    />
                  </label>
                </Button>
                {logoPreview ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSaving}
                    onClick={handleRemoveLogo}
                  >
                    <Trash2 className="size-4" />
                    {t('settings.removeLogo')}
                  </Button>
                ) : null}
              </div>
            </div>
            {form.formState.errors.logo_file ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.logo_file.message}
              </p>
            ) : null}
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="app_name_en">{t('settings.appNameEn')}</Label>
              <Input id="app_name_en" {...form.register('app_name_en')} />
              {form.formState.errors.app_name_en ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.app_name_en.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="app_name_ar">{t('settings.appNameAr')}</Label>
              <Input
                id="app_name_ar"
                dir="rtl"
                {...form.register('app_name_ar')}
              />
              {form.formState.errors.app_name_ar ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.app_name_ar.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="app_short_name_en">
                {t('settings.appShortNameEn')}
              </Label>
              <Input
                id="app_short_name_en"
                {...form.register('app_short_name_en')}
              />
              {form.formState.errors.app_short_name_en ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.app_short_name_en.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="app_short_name_ar">
                {t('settings.appShortNameAr')}
              </Label>
              <Input
                id="app_short_name_ar"
                dir="rtl"
                {...form.register('app_short_name_ar')}
              />
              {form.formState.errors.app_short_name_ar ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.app_short_name_ar.message}
                </p>
              ) : null}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sign_in_description_en">
                {t('settings.signInDescriptionEn')}
              </Label>
              <Textarea
                id="sign_in_description_en"
                rows={3}
                {...form.register('sign_in_description_en')}
              />
              {form.formState.errors.sign_in_description_en ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.sign_in_description_en.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sign_in_description_ar">
                {t('settings.signInDescriptionAr')}
              </Label>
              <Textarea
                id="sign_in_description_ar"
                dir="rtl"
                rows={3}
                {...form.register('sign_in_description_ar')}
              />
              {form.formState.errors.sign_in_description_ar ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.sign_in_description_ar.message}
                </p>
              ) : null}
            </div>
          </section>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSaving || !form.formState.isDirty}
            >
              {isSaving ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
