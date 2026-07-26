import type { UserRole } from '@/types/database'

/** Roles the actor may create or reset passwords for. */
export function getManagedRoles(actorRole: UserRole | undefined): UserRole[] {
  if (actorRole === 'company_director') {
    return ['factory_manager', 'project_manager']
  }

  if (actorRole === 'factory_manager') {
    return ['project_manager']
  }

  return []
}

export function canManageAccounts(actorRole: UserRole | undefined): boolean {
  return getManagedRoles(actorRole).length > 0
}

export function canManageAccountRole(
  actorRole: UserRole | undefined,
  targetRole: UserRole,
): boolean {
  return getManagedRoles(actorRole).includes(targetRole)
}
