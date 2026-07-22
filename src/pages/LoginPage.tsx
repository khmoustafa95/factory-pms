import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { LocaleToggle } from '@/components/LocaleToggle'
import { StatusMessage } from '@/components/StatusMessage'
import { ThemeToggle } from '@/components/ThemeToggle'
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
import {
  loginFormSchema,
  type LoginFormValues,
} from '@/lib/validations/account'

export function LoginPage() {
  const { signIn, isConfigured, session, isLoading } = useAuth()
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  if (!isLoading && session) {
    return <Navigate to="/" replace />
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setIsSubmitting(true)

    try {
      await signIn(values.email, values.password)
      toast.success(t('auth.signedInSuccess'))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('auth.signInFailed')
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  })

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6">
      <div className="absolute end-4 top-4 flex items-center gap-2 sm:end-6 sm:top-6">
        <LocaleToggle />
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('auth.signInTitle')}</CardTitle>
          <CardDescription>{t('auth.signInDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isConfigured ? (
            <StatusMessage variant="warning">
              {t('auth.supabaseNotConfigured')}
            </StatusMessage>
          ) : null}

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">{t('common.email')}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                {...form.register('email')}
              />
              {form.formState.errors.email ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...form.register('password')}
              />
              {form.formState.errors.password ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.password.message}
                </p>
              ) : null}
            </div>

            <Button className="w-full" disabled={!isConfigured || isSubmitting}>
              {isSubmitting ? t('common.signingIn') : t('common.signIn')}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {t('auth.needAccount')}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
