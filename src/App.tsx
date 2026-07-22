import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/AppLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RoleRoute } from '@/components/auth/RoleRoute'
import { AccountsPage } from '@/pages/AccountsPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { FactoriesPage } from '@/pages/FactoriesPage'
import { LoginPage } from '@/pages/LoginPage'
import { ProjectDetailPage } from '@/pages/ProjectDetailPage'
import { ProjectsPage } from '@/pages/ProjectsPage'

export default function App() {
  return (
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
            <Route path="projects/:projectId" element={<ProjectDetailPage />} />
          </Route>
          <Route element={<RoleRoute allowedRoles={['company_director']} />}>
            <Route path="factories" element={<FactoriesPage />} />
            <Route path="accounts" element={<AccountsPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
