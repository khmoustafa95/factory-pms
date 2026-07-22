import type { UserRole } from '@/types/database'

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  company_director: 'Company Director',
  factory_manager: 'Factory Manager',
  project_manager: 'Project Manager',
}

export function isCompanyDirector(role: UserRole | undefined): boolean {
  return role === 'company_director'
}

export function isFactoryManager(role: UserRole | undefined): boolean {
  return role === 'factory_manager'
}

export function isProjectManager(role: UserRole | undefined): boolean {
  return role === 'project_manager'
}
