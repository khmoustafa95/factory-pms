import type { Profile, UserRole } from '@/types/database'
import { canControl, isCompanyDirector } from '@/lib/roles'
import type { ManagedAccountRole } from '@/lib/validations/account'

const MANAGED_ROLES: ManagedAccountRole[] = [
  'company_director',
  'factory_manager',
]

/** Roles the actor may create or reset passwords for. */
export function getManagedRoles(
  actor: Pick<Profile, 'role' | 'can_control'> | null | undefined,
): ManagedAccountRole[] {
  if (!actor || !canControl(actor) || !isCompanyDirector(actor.role)) {
    return []
  }

  return MANAGED_ROLES
}

export function canManageAccounts(
  actor: Pick<Profile, 'role' | 'can_control'> | null | undefined,
): boolean {
  return getManagedRoles(actor).length > 0
}

export function canManageAccountRole(
  actor: Pick<Profile, 'role' | 'can_control'> | null | undefined,
  targetRole: UserRole,
): boolean {
  return getManagedRoles(actor).some((role) => role === targetRole)
}
