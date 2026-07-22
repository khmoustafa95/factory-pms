import {
  AlertTriangle,
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { LocaleToggle } from '@/components/LocaleToggle'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/contexts/LocaleContext'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { isCompanyDirector } from '@/lib/roles'
import { getRoleLabel } from '@/lib/i18n-format'
import { cn } from '@/lib/utils'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-primary text-primary-foreground'
      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
  )

const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
    isActive
      ? 'bg-primary text-primary-foreground'
      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
  )

export function AppLayout() {
  const { profile, signOut } = useAuth()
  const { t } = useTranslation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const isDirector = isCompanyDirector(profile?.role)

  const handleSignOut = async () => {
    await signOut()
  }

  const navItems = [
    { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard, end: true },
    { to: '/projects', label: t('nav.projects'), icon: ClipboardList },
    { to: '/escalations', label: t('nav.escalations'), icon: AlertTriangle },
    ...(isDirector
      ? [
          { to: '/factories', label: t('nav.factories'), icon: Building2 },
          { to: '/accounts', label: t('nav.accounts'), icon: Users },
        ]
      : []),
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-6">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="md:hidden"
              aria-label={t('common.menu')}
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="size-4" />
            </Button>

            <Link
              className="truncate text-sm font-semibold tracking-tight sm:text-base"
              to="/"
            >
              <span className="hidden sm:inline">{t('app.name')}</span>
              <span className="sm:hidden">{t('app.shortName')}</span>
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  className={navLinkClass}
                  to={item.to}
                  end={item.end}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-2 sm:flex">
              <LocaleToggle />
              <ThemeToggle />
            </div>

            {profile ? (
              <div className="hidden text-end lg:block">
                <p className="text-sm font-medium">{profile.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {getRoleLabel(t, profile.role)}
                </p>
              </div>
            ) : null}

            <Button size="sm" variant="outline" onClick={handleSignOut}>
              <LogOut className="size-4" />
              <span className="hidden sm:inline">{t('common.signOut')}</span>
            </Button>
          </div>
        </div>
      </header>

      <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <DialogContent
          showCloseButton
          className="fixed inset-y-0 start-0 top-0 h-full max-h-full w-[min(100vw-2rem,20rem)] max-w-none translate-x-0 translate-y-0 rounded-none rounded-e-xl border-e data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-xs"
        >
          <DialogHeader>
            <DialogTitle>{t('common.navigation')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <LocaleToggle />
              <ThemeToggle />
            </div>

            {profile ? (
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-sm font-medium">{profile.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {getRoleLabel(t, profile.role)}
                </p>
              </div>
            ) : null}

            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  className={mobileNavLinkClass}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileNavOpen(false)}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </DialogContent>
      </Dialog>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <Outlet />
      </main>
    </div>
  )
}
