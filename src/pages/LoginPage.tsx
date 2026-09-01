import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { DemoAccountsDialog } from '@/components/auth/DemoAccountsDialog'
import { FadeIn } from '@/components/motion'
import { LocaleToggle } from '@/components/LocaleToggle'
import { AppBrand } from '@/components/AppBrand'
import { StatusMessage } from '@/components/StatusMessage'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/contexts/AuthContext'
import { useAppBranding } from '@/contexts/AppSettingsContext'
import { useTranslation } from '@/contexts/LocaleContext'
import { isAuthError } from '@/lib/auth-errors'
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
import { useValidationSchema } from '@/hooks/useValidationSchema'
import { shouldShowDemoAccounts } from '@/lib/app-env'
import {
  createLoginFormSchema,
  type LoginFormValues,
} from '@/lib/validations/account'

export function LoginPage() {
  const { signIn, signOut, isConfigured, session, profile, isLoading } =
    useAuth()
  const { branding } = useAppBranding()
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const loginFormSchema = useValidationSchema(createLoginFormSchema)
  const showDemoAccounts = shouldShowDemoAccounts()
  const isForcedSignOut = searchParams.get('signout') === '1'

  useEffect(() => {
    if (!isForcedSignOut) {
      return
    }

    let cancelled = false

    void signOut().finally(() => {
      if (!cancelled) {
        setSearchParams({}, { replace: true })
      }
    })

    return () => {
      cancelled = true
    }
  }, [isForcedSignOut, setSearchParams, signOut])

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  if (!isLoading && !isForcedSignOut && session && profile?.is_active) {
    return <Navigate to="/" replace />
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setIsSubmitting(true)

    try {
      await signIn(values.email, values.password)
      toast.success(t('auth.signedInSuccess'))
    } catch (error) {
      let message = t('auth.signInFailed')

      if (isAuthError(error)) {
        message =
          error.code === 'INACTIVE_ACCOUNT'
            ? t('auth.accountInactive')
            : t('auth.noProfile')
      } else if (error instanceof Error) {
        message = error.message
      }

      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  })

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6">
      <div className="absolute inset-e-4 top-4 flex items-center gap-2 sm:inset-e-6 sm:top-6">
        <LocaleToggle />
        <ThemeToggle />
      </div>

      <FadeIn>
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-4">
            <div className="flex justify-center">
              <AppBrand />
            </div>
            <div className="space-y-1 text-center">
              <CardTitle>{t('auth.signInTitle')}</CardTitle>
              <CardDescription>{branding.signInDescription}</CardDescription>
            </div>
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

              <Button
                className="w-full"
                disabled={!isConfigured || isSubmitting}
              >
                {isSubmitting ? t('common.signingIn') : t('common.signIn')}
              </Button>
            </form>

            {showDemoAccounts ? <DemoAccountsDialog /> : null}

            {showDemoAccounts ? (
              <p className="text-center text-xs text-muted-foreground">
                {t('auth.demoAccounts.loginOnlyHint')}
              </p>
            ) : null}

            <p className="text-center text-sm text-muted-foreground">
              {t('auth.needAccount')}
            </p>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  )
}
