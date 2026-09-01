import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/contexts/LocaleContext'

export type ActiveFilterChip = {
  id: string
  label: string
  onRemove: () => void
}

interface ActiveFilterChipsProps {
  chips: ActiveFilterChip[]
  onClearAll?: () => void
  className?: string
}

export function ActiveFilterChips({
  chips,
  onClearAll,
  className,
}: ActiveFilterChipsProps) {
  const { t } = useTranslation()

  if (chips.length === 0) {
    return null
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm ${className ?? ''}`}
    >
      <span className="text-muted-foreground">{t('dashboard.activeDrill')}</span>
      {chips.map((chip) => (
        <Badge key={chip.id} variant="secondary" className="gap-1 pe-1">
          {chip.label}
          <button
            type="button"
            className="rounded-sm p-0.5 hover:bg-muted"
            aria-label={t('list.clearFilters')}
            onClick={chip.onRemove}
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      {onClearAll ? (
        <Button type="button" size="sm" variant="ghost" onClick={onClearAll}>
          {t('list.clearFilters')}
        </Button>
      ) : null}
    </div>
  )
}
