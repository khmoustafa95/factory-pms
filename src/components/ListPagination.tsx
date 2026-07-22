import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslation } from '@/contexts/LocaleContext'
import {
  getShowingRange,
  getTotalPages,
  PAGE_SIZE_OPTIONS,
} from '@/lib/list-query'

interface ListPaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

export function ListPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: ListPaginationProps) {
  const { t } = useTranslation()
  const totalPages = getTotalPages(total, pageSize)
  const { from, to } = getShowingRange(page, pageSize, total)

  if (total === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {t('list.showing', { from, to, total })}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Label htmlFor="rows-per-page" className="text-sm whitespace-nowrap">
            {t('list.rowsPerPage')}
          </Label>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger id="rows-per-page" className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {t('list.page', { page, totalPages })}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label={t('list.previous')}
          >
            <ChevronLeft className="size-4 ltr:block rtl:hidden" />
            <ChevronRight className="hidden size-4 ltr:hidden rtl:block" />
            <span className="sr-only sm:not-sr-only sm:ltr:ml-1 sm:rtl:mr-1">
              {t('list.previous')}
            </span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label={t('list.next')}
          >
            <span className="sr-only sm:not-sr-only sm:ltr:mr-1 sm:rtl:ml-1">
              {t('list.next')}
            </span>
            <ChevronRight className="size-4 ltr:block rtl:hidden" />
            <ChevronLeft className="hidden size-4 ltr:hidden rtl:block" />
          </Button>
        </div>
      </div>
    </div>
  )
}
