import type { ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTranslation } from '@/contexts/LocaleContext'

export type PageHeaderActionItem = {
  id: string
  label: ReactNode
  onClick?: () => void
  disabled?: boolean
  destructive?: boolean
  hidden?: boolean
}

interface PageHeaderActionsProps {
  primary?: PageHeaderActionItem | null
  secondary?: PageHeaderActionItem[]
}

export function PageHeaderActions({
  primary,
  secondary = [],
}: PageHeaderActionsProps) {
  const { t } = useTranslation()
  const visibleSecondary = secondary.filter((item) => !item.hidden)

  if (!primary && visibleSecondary.length === 0) {
    return null
  }

  const renderItem = (item: PageHeaderActionItem, asMenuItem = false) => {
    if (asMenuItem) {
      return (
        <DropdownMenuItem
          key={item.id}
          disabled={item.disabled}
          variant={item.destructive ? 'destructive' : 'default'}
          onClick={item.onClick}
        >
          {item.label}
        </DropdownMenuItem>
      )
    }

    return (
      <Button
        key={item.id}
        type="button"
        size="sm"
        variant={item.destructive ? 'destructive' : 'outline'}
        disabled={item.disabled}
        onClick={item.onClick}
      >
        {item.label}
      </Button>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {primary ? renderItem(primary) : null}

      {visibleSecondary.length > 0 ? (
        <>
          <div className="hidden flex-wrap items-center gap-2 sm:flex">
            {visibleSecondary.map((item) => renderItem(item))}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="sm:hidden"
                aria-label={t('common.moreActions')}
              >
                <MoreHorizontal className="size-4" />
                {t('common.moreActions')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {visibleSecondary.map((item) => renderItem(item, true))}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      ) : null}
    </div>
  )
}
