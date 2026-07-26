import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslation } from '@/contexts/LocaleContext'

export type ListFilterConfig = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}

interface ListToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
  filters?: ListFilterConfig[]
  onClear?: () => void
  hasActiveFilters?: boolean
}

export function ListToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  filters = [],
  onClear,
  hasActiveFilters = false,
}: ListToolbarProps) {
  const { t } = useTranslation()

  return (
    <div className="app-panel space-y-3 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="list-search">{t('list.search')}</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="list-search"
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="ps-8"
            />
          </div>
        </div>

        {filters.map((filter) => (
          <div key={filter.id} className="space-y-1.5 lg:w-44">
            <Label htmlFor={filter.id}>{filter.label}</Label>
            <Select value={filter.value} onValueChange={filter.onChange}>
              <SelectTrigger id={filter.id} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filter.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}

        {hasActiveFilters && onClear ? (
          <Button type="button" variant="outline" onClick={onClear}>
            <X className="size-4" />
            {t('list.clearFilters')}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
