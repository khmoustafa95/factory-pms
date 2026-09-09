import type { Profile, UserRole } from '@/types/database'

export function isCompanyDirector(role: UserRole | undefined): boolean {
  return role === 'company_director'
}

export function isFactoryManager(role: UserRole | undefined): boolean {
  return role === 'factory_manager'
}

export function canControl(
  profile: Pick<Profile, 'can_control'> | null | undefined,
): boolean {
  return Boolean(profile?.can_control)
}
