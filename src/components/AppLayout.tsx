import {
  AlertTriangle,
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  PanelRight,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { NavLink, Outlet, useMatch } from 'react-router-dom'
import { PageTransition } from '@/components/motion'
import { AppBrand } from '@/components/AppBrand'
import { LocaleToggle } from '@/components/LocaleToggle'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/contexts/LocaleContext'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { isCompanyDirector } from '@/lib/roles'
import { getRoleLabel } from '@/lib/i18n-format'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

function AppSidebarNavItem({ item }: { item: NavItem }) {
  const { dir } = useTranslation()
  const { isMobile, setOpenMobile } = useSidebar()
  const match = useMatch({ path: item.to, end: item.end ?? false })
  const isActive = Boolean(match)

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={{
          children: item.label,
          side: dir === 'rtl' ? 'left' : 'right',
        }}
      >
        <NavLink
          to={item.to}
          end={item.end}
          onClick={() => {
            if (isMobile) {
              setOpenMobile(false)
            }
          }}
        >
          <item.icon />
          <span>{item.label}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function AppSidebar({ navItems }: { navItems: NavItem[] }) {
  const { profile, signOut } = useAuth()
  const { t, dir } = useTranslation()
  const { state } = useSidebar()
  const collapsed = state === 'collapsed'

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <Sidebar
      side={dir === 'rtl' ? 'right' : 'left'}
      collapsible="icon"
      variant="sidebar"
    >
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="data-[slot=sidebar-menu-button]:p-2!"
            >
              <AppBrand layout="sidebar" linkToHome showFullName />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('common.navigation')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <AppSidebarNavItem key={item.to} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-2 border-t border-sidebar-border">
        {profile ? (
          <div
            className={cn(
              'flex items-center gap-2 rounded-lg px-2 py-1.5',
              collapsed && 'justify-center px-0',
            )}
          >
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground"
              aria-hidden
            >
              {profile.full_name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase() ?? '')
                .join('') || '?'}
            </div>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-medium leading-tight">
                {profile.full_name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {getRoleLabel(t, profile.role)}
              </p>
            </div>
          </div>
        ) : null}

        <div className={cn(collapsed && 'flex justify-center')}>
          <Button
            size={collapsed ? 'icon-sm' : 'sm'}
            variant="outline"
            onClick={handleSignOut}
            aria-label={t('common.signOut')}
            className={cn(!collapsed && 'w-full gap-1.5')}
          >
            <LogOut className="size-4" />
            <span className="group-data-[collapsible=icon]:hidden">
              {t('common.signOut')}
            </span>
          </Button>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

function AppSidebarToggle() {
  const { t, dir } = useTranslation()
  const { toggleSidebar } = useSidebar()
  const Icon = dir === 'rtl' ? PanelRight : PanelLeft

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="size-8"
      aria-label={t('a11y.toggleSidebar')}
      onClick={toggleSidebar}
    >
      <Icon className="size-4" />
    </Button>
  )
}

function AppTopBar() {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 pe-4 ps-20 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="absolute left-4 top-1/2 flex -translate-y-1/2 items-center gap-1">
        <LocaleToggle align="start" />
        <ThemeToggle align="start" />
      </div>
      <AppSidebarToggle />
      <Separator orientation="vertical" className="me-1 h-4" />
      <span className="truncate text-sm text-muted-foreground md:hidden">
        <AppBrand showFullName={false} />
      </span>
    </header>
  )
}

export function AppLayout() {
  const { profile } = useAuth()
  const { t } = useTranslation()
  const isDirector = isCompanyDirector(profile?.role)

  const navItems: NavItem[] = [
    { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard, end: true },
    { to: '/projects', label: t('nav.projects'), icon: ClipboardList },
    { to: '/escalations', label: t('nav.escalations'), icon: AlertTriangle },
    ...(isDirector
      ? [
          {
            to: '/factories',
            label: t('nav.factories'),
            icon: Building2,
          },
          { to: '/accounts', label: t('nav.accounts'), icon: Users },
          { to: '/settings', label: t('nav.settings'), icon: Settings },
        ]
      : []),
  ]

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider defaultOpen>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:inset-s-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          {t('a11y.skipToContent')}
        </a>

        <AppSidebar navItems={navItems} />

        <SidebarInset>
          <AppTopBar />

          <main
            id="main-content"
            tabIndex={-1}
            aria-label={t('a11y.mainContent')}
            className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10"
          >
            <PageTransition>
              <Outlet />
            </PageTransition>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
