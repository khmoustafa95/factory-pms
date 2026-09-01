import {
  LogOut,
  PanelLeft,
  PanelRight,
} from 'lucide-react'
import { NavLink, Outlet, useMatch } from 'react-router-dom'
import { useIsFetching } from '@tanstack/react-query'
import { PageTransition } from '@/components/motion'
import { AppBrand } from '@/components/AppBrand'
import { CommandPalette } from '@/components/CommandPalette'
import { FetchingBar } from '@/components/FetchingBar'
import { LocaleToggle } from '@/components/LocaleToggle'
import { NotificationBell } from '@/components/notifications/NotificationBell'
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
import { isCompanyDirector, isFactoryManager } from '@/lib/roles'
import { getRoleLabel } from '@/lib/i18n-format'
import { getAppNavItems, type AppNavItem } from '@/lib/nav'

function profileInitials(fullName: string) {
  return (
    fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
}

function AppSidebarNavItem({ item }: { item: AppNavItem }) {
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

function AppSidebar({ navItems }: { navItems: AppNavItem[] }) {
  const { profile, signOut } = useAuth()
  const { t, dir } = useTranslation()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <Sidebar
      side={dir === 'rtl' ? 'right' : 'left'}
      collapsible="icon"
      variant="sidebar"
      dir={dir}
    >
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="data-[slot=sidebar-menu-button]:px-2!"
            >
              <AppBrand layout="sidebar" linkToHome showFullName />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="px-2">
            {t('common.navigation')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <AppSidebarNavItem key={item.to} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-1 border-t border-sidebar-border p-2">
        {profile ? (
          <div className="flex h-12 items-center gap-2 overflow-hidden rounded-md px-2 text-sm group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2!">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground"
              aria-hidden
            >
              {profileInitials(profile.full_name)}
            </span>
            <span className="grid min-w-0 flex-1 text-start leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-medium">{profile.full_name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {getRoleLabel(t, profile.role)}
              </span>
            </span>
          </div>
        ) : null}

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip={{
                children: t('common.signOut'),
                side: dir === 'rtl' ? 'left' : 'right',
              }}
            >
              <button
                type="button"
                dir={dir}
                aria-label={t('common.signOut')}
                onClick={() => {
                  void handleSignOut()
                }}
              >
                <LogOut />
                <span>{t('common.signOut')}</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
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
      className="size-8 text-muted-foreground"
      aria-label={t('a11y.toggleSidebar')}
      onClick={toggleSidebar}
    >
      <Icon className="size-4" />
    </Button>
  )
}

function AppTopBar({ navItems }: { navItems: AppNavItem[] }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/90 px-3 backdrop-blur supports-backdrop-filter:bg-background/75 sm:px-4">
      <AppSidebarToggle />
      <Separator orientation="vertical" className="hidden h-4 sm:block" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-muted-foreground md:hidden">
        <AppBrand showFullName={false} />
      </span>
      <div className="ms-auto flex items-center gap-1">
        <CommandPalette navItems={navItems} />
        <NotificationBell />
        <LocaleToggle />
        <ThemeToggle />
      </div>
    </header>
  )
}

export function AppLayout() {
  const { profile } = useAuth()
  const { t, dir } = useTranslation()
  const isFetching = useIsFetching() > 0
  const isDirector = isCompanyDirector(profile?.role)
  const canManageAccounts = isDirector || isFactoryManager(profile?.role)

  const navItems = getAppNavItems({
    t,
    isDirector,
    canManageAccounts,
  })

  return (
    <TooltipProvider delayDuration={0}>
      <FetchingBar active={isFetching} />
      <SidebarProvider defaultOpen>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:inset-s-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          {t('a11y.skipToContent')}
        </a>

        <AppSidebar navItems={navItems} />

        <SidebarInset dir={dir} className="bg-background">
          <AppTopBar navItems={navItems} />

          <div
            id="main-content"
            tabIndex={-1}
            aria-label={t('a11y.mainContent')}
            className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 text-start sm:px-6 lg:px-8"
          >
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
