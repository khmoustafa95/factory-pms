import {
  AlertTriangle,
  Building2,
  ClipboardList,
  LayoutDashboard,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type AppNavItem = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

type TranslateFn = (key: string) => string

export function getAppNavItems({
  t,
  isDirector,
  canManageAccounts,
}: {
  t: TranslateFn
  isDirector: boolean
  canManageAccounts: boolean
}): AppNavItem[] {
  return [
    { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard, end: true },
    { to: '/projects', label: t('nav.projects'), icon: ClipboardList },
    { to: '/escalations', label: t('nav.escalations'), icon: AlertTriangle },
    ...(canManageAccounts
      ? [{ to: '/accounts', label: t('nav.accounts'), icon: Users }]
      : []),
    ...(isDirector
      ? [{ to: '/factories', label: t('nav.factories'), icon: Building2 }]
      : []),
    { to: '/settings', label: t('nav.settings'), icon: Settings },
  ]
}
