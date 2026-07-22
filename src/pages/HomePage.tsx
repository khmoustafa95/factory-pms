import { isSupabaseConfigured } from '@/lib/supabase'

export function HomePage() {
  const configured = isSupabaseConfigured()

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight">
        Projects System Management
      </h1>
      <p className="max-w-xl text-slate-600">
        Vite + React + TypeScript scaffold with Supabase client wiring. Add your
        project keys to{' '}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
          .env.local
        </code>{' '}
        to connect.
      </p>
      <p
        className={
          configured
            ? 'text-sm font-medium text-emerald-700'
            : 'text-sm font-medium text-amber-700'
        }
      >
        Supabase: {configured ? 'configured' : 'not configured'}
      </p>
    </section>
  )
}
