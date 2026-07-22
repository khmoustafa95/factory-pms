import {
  AlertTriangle,
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Users,
} from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { isCompanyDirector, USER_ROLE_LABELS } from '@/lib/roles'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-slate-900 text-white'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  ].join(' ')

export function AppLayout() {
  const { profile, signOut } = useAuth()
  const isDirector = isCompanyDirector(profile?.role)

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <div className="flex items-center gap-6">
            <Link className="text-sm font-semibold tracking-tight" to="/">
              Projects System Management
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              <NavLink className={navLinkClass} to="/" end>
                <LayoutDashboard className="size-4" />
                Dashboard
              </NavLink>
              <NavLink className={navLinkClass} to="/projects">
                <ClipboardList className="size-4" />
                Projects
              </NavLink>
              <NavLink className={navLinkClass} to="/escalations">
                <AlertTriangle className="size-4" />
                Escalations
              </NavLink>
              {isDirector ? (
                <>
                  <NavLink className={navLinkClass} to="/factories">
                    <Building2 className="size-4" />
                    Factories
                  </NavLink>
                  <NavLink className={navLinkClass} to="/accounts">
                    <Users className="size-4" />
                    Accounts
                  </NavLink>
                </>
              ) : null}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {profile ? (
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium">{profile.full_name}</p>
                <p className="text-xs text-slate-500">
                  {USER_ROLE_LABELS[profile.role]}
                </p>
              </div>
            ) : null}
            <Button size="sm" variant="outline" onClick={handleSignOut}>
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  )
}
