import type { UserRole } from '@/types/database'

export function isCompanyDirector(role: UserRole | undefined): boolean {
  return role === 'company_director'
}

export function isFactoryManager(role: UserRole | undefined): boolean {
  return role === 'factory_manager'
}

export function isProjectManager(role: UserRole | undefined): boolean {
  return role === 'project_manager'
}
