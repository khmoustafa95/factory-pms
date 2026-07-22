import { Link } from 'react-router-dom'
import { Building2, ClipboardList, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  isCompanyDirector,
  isFactoryManager,
  USER_ROLE_LABELS,
} from '@/lib/roles'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function DashboardPage() {
  const { profile } = useAuth()
  const roleLabel = profile ? USER_ROLE_LABELS[profile.role] : 'User'
  const isDirector = isCompanyDirector(profile?.role)
  const isManager = isFactoryManager(profile?.role)

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="max-w-2xl text-slate-600">
          Welcome back{profile ? `, ${profile.full_name}` : ''}. You are signed
          in as <span className="font-medium text-slate-900">{roleLabel}</span>.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {isCompanyDirector(profile?.role) ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="size-5" />
                  Factories
                </CardTitle>
                <CardDescription>
                  Create and manage factory sites for the company.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link to="/factories">Open factories</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="size-5" />
                  Accounts
                </CardTitle>
                <CardDescription>
                  Assign roles and factory scope for each user.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline">
                  <Link to="/accounts">Manage accounts</Link>
                </Button>
              </CardContent>
            </Card>
          </>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="size-5" />
              Projects
            </CardTitle>
            <CardDescription>
              {isManager
                ? 'Submit project proposals for director approval.'
                : isDirector
                  ? 'Approve or reject submitted proposals.'
                  : 'Track projects assigned to you.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant={isDirector ? 'outline' : 'default'}>
              <Link to="/projects">Open projects</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
