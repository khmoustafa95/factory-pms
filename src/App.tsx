import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/AppLayout'
import { RouteFallback } from '@/components/RouteFallback'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RoleRoute } from '@/components/auth/RoleRoute'

const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
)
const ProjectsPage = lazy(() =>
  import('@/pages/ProjectsPage').then((module) => ({
    default: module.ProjectsPage,
  })),
)
const ProjectDetailPage = lazy(() =>
  import('@/pages/ProjectDetailPage').then((module) => ({
    default: module.ProjectDetailPage,
  })),
)
const EscalationsPage = lazy(() =>
  import('@/pages/EscalationsPage').then((module) => ({
    default: module.EscalationsPage,
  })),
)
const DeadlinesCalendarPage = lazy(() =>
  import('@/pages/DeadlinesCalendarPage').then((module) => ({
    default: module.DeadlinesCalendarPage,
  })),
)
const FactoriesPage = lazy(() =>
  import('@/pages/FactoriesPage').then((module) => ({
    default: module.FactoriesPage,
  })),
)
const AccountsPage = lazy(() =>
  import('@/pages/AccountsPage').then((module) => ({
    default: module.AccountsPage,
  })),
)
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((module) => ({
    default: module.SettingsPage,
  })),
)
const LoginPage = lazy(() =>
  import('@/pages/LoginPage').then((module) => ({
    default: module.LoginPage,
  })),
)

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route
              element={
                <RoleRoute
                  allowedRoles={[
                    'company_director',
                    'factory_manager',
                    'project_manager',
                  ]}
                />
              }
            >
              <Route path="projects" element={<ProjectsPage />} />
              <Route
                path="projects/:projectId"
                element={<ProjectDetailPage />}
              />
              <Route path="deadlines" element={<DeadlinesCalendarPage />} />
              <Route path="escalations" element={<EscalationsPage />} />
            </Route>
            <Route
              element={
                <RoleRoute
                  allowedRoles={['company_director', 'factory_manager']}
                />
              }
            >
              <Route path="accounts" element={<AccountsPage />} />
            </Route>
            <Route element={<RoleRoute allowedRoles={['company_director']} />}>
              <Route path="factories" element={<FactoriesPage />} />
            </Route>
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
