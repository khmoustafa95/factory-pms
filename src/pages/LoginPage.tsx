import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
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
      toast.success('Signed in successfully')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to sign in'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Projects System Management — factory leadership portal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isConfigured ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Supabase is not configured. Copy{' '}
              <code className="rounded bg-white px-1">.env.example</code> to{' '}
              <code className="rounded bg-white px-1">.env.local</code> and add
              your project keys.
            </p>
          ) : null}

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                {...form.register('email')}
              />
              {form.formState.errors.email ? (
                <p className="text-sm text-red-600">
                  {form.formState.errors.email.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...form.register('password')}
              />
              {form.formState.errors.password ? (
                <p className="text-sm text-red-600">
                  {form.formState.errors.password.message}
                </p>
              ) : null}
            </div>

            <Button className="w-full" disabled={!isConfigured || isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500">
            Need an account? Ask your company director to provision access in
            Supabase Auth, then assign your role from the Accounts screen.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
