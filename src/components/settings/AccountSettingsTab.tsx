import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { FormFieldError } from '@/components/FormFieldError'
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
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/contexts/LocaleContext'
import { getSupabase } from '@/lib/supabase'

const accountSchema = z.object({
  full_name: z.string().trim().min(2),
})

type AccountFormValues = z.infer<typeof accountSchema>

export function AccountSettingsTab() {
  const { t } = useTranslation()
  const { profile, user } = useAuth()

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: { full_name: '' },
  })

  useEffect(() => {
    if (profile) {
      form.reset({ full_name: profile.full_name })
    }
  }, [form, profile])

  const onSubmit = form.handleSubmit(async (values) => {
    if (!user) return

    try {
      const supabase = getSupabase()
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: values.full_name })
        .eq('id', user.id)

      if (error) throw error
      toast.success(t('settings.account.saved'))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('settings.saveFailed')
      toast.error(message)
    }
  })

  if (!profile) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.account.title')}</CardTitle>
        <CardDescription>{t('settings.account.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('common.email')}</Label>
              <Input value={profile.email} disabled />
            </div>
            <div className="space-y-2">
              <Label>{t('settings.account.role')}</Label>
              <Input value={t(`roles.${profile.role}`)} disabled />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-name">
              {t('settings.account.fullName')}
            </Label>
            <Input id="account-name" {...form.register('full_name')} />
            <FormFieldError error={form.formState.errors.full_name} />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || !form.formState.isDirty}
            >
              {form.formState.isSubmitting
                ? t('common.saving')
                : t('common.save')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
