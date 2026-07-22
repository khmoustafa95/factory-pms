import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAppBranding } from '@/contexts/AppSettingsContext'

interface AppBrandProps {
  className?: string
  showFullName?: boolean
  linkToHome?: boolean
}

export function AppBrand({
  className,
  showFullName = true,
  linkToHome = false,
}: AppBrandProps) {
  const { branding } = useAppBranding()

  const content = (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      {branding.logoUrl ? (
        <img
          src={branding.logoUrl}
          alt=""
          className="size-8 shrink-0 rounded-md object-contain"
        />
      ) : null}
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
    </span>
  )

  if (linkToHome) {
    return (
      <Link className="min-w-0 text-sm sm:text-base" to="/">
        {content}
      </Link>
    )
  }

  return content
}
