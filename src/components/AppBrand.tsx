import { Building2 } from 'lucide-react'
import type { ComponentPropsWithoutRef } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAppBranding } from '@/contexts/AppSettingsContext'

type AppBrandBaseProps = {
  className?: string
  showFullName?: boolean
  /** Stacked company name under a larger mark — for sidebar header */
  layout?: 'inline' | 'sidebar'
}

type AppBrandAsLinkProps = AppBrandBaseProps &
  Omit<LinkProps, 'to' | 'children'> & {
    linkToHome: true
  }

type AppBrandAsSpanProps = AppBrandBaseProps &
  ComponentPropsWithoutRef<'span'> & {
    linkToHome?: false
  }

export type AppBrandProps = AppBrandAsLinkProps | AppBrandAsSpanProps

export function AppBrand(props: AppBrandProps) {
  const {
    className,
    showFullName = true,
    layout = 'inline',
    linkToHome = false,
    ...rest
  } = props
  const { branding } = useAppBranding()

  const mark = branding.logoUrl ? (
    <img
      src={branding.logoUrl}
      alt=""
      className="size-8 shrink-0 rounded-md object-contain"
    />
  ) : (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"
      aria-hidden
    >
      <Building2 className="size-4" />
    </span>
  )

  const label =
    layout === 'sidebar' ? (
      <span className="grid min-w-0 flex-1 text-start text-sm leading-tight">
        <span className="truncate font-semibold tracking-tight">
          {branding.name}
        </span>
        {branding.shortName && branding.shortName !== branding.name ? (
          <span className="truncate text-xs text-muted-foreground">
            {branding.shortName}
          </span>
        ) : null}
      </span>
    ) : (
      <span className="truncate font-semibold tracking-tight">
        {showFullName ? (
          <>
            <span className="hidden sm:inline">{branding.name}</span>
            <span className="sm:hidden">{branding.shortName}</span>
          </>
        ) : (
          branding.shortName
        )}
      </span>
    )

  if (linkToHome) {
    const linkProps = rest as Omit<LinkProps, 'to' | 'children'>
    return (
      <Link
        to="/"
        className={cn(
          'min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
          layout === 'sidebar'
            ? 'flex w-full items-center gap-2'
            : 'inline-flex items-center gap-2 text-sm sm:text-base',
          className,
        )}
        {...linkProps}
      >
        {mark}
        {label}
      </Link>
    )
  }

  const spanProps = rest as ComponentPropsWithoutRef<'span'>
  return (
    <span
      className={cn(
        layout === 'sidebar'
          ? 'flex min-w-0 items-center gap-2'
          : 'inline-flex min-w-0 items-center gap-2',
        className,
      )}
      {...spanProps}
    >
      {mark}
      {label}
    </span>
  )
}
