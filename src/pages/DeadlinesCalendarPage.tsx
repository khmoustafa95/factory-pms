import { useMemo, useState } from 'react'
import { addDays, endOfMonth, max as maxDate, startOfMonth } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import { Link, useSearchParams } from 'react-router-dom'
import { Calendar } from '@/components/ui/calendar'
import { PageHeader } from '@/components/PageHeader'
import { QueryState } from '@/components/QueryState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslation } from '@/contexts/LocaleContext'
import { useCalendarDeadlines } from '@/hooks/useDeadlines'
import { formatDateOnly, parseDateOnly, todayDateOnly } from '@/lib/date-only'
import { formatLocalizedDate } from '@/lib/i18n-format'
import { cn } from '@/lib/utils'
import type { CalendarDeadlineKind } from '@/types/database'

type KindFilter = 'all' | CalendarDeadlineKind

const KIND_FILTERS: KindFilter[] = ['all', 'task', 'phase', 'project']

function deadlineHref(projectId: string): string {
  return `/projects/${projectId}`
}

export function DeadlinesCalendarPage() {
  const { t, locale, dir } = useTranslation()
  const [searchParams] = useSearchParams()
  const today = todayDateOnly()
  const rangeWindow = searchParams.get('range') === '7d'
  const [month, setMonth] = useState(() => new Date())
  const [selected, setSelected] = useState<Date>(() => new Date())
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')
  const [listMode, setListMode] = useState<'day' | 'window'>(
    rangeWindow ? 'window' : 'day',
  )

  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const todayDate = parseDateOnly(today) ?? new Date()
  const windowEndDate = addDays(todayDate, 7)
  const from = formatDateOnly(monthStart)
  const to = formatDateOnly(
    todayDate >= monthStart && todayDate <= monthEnd
      ? maxDate([monthEnd, windowEndDate])
      : monthEnd,
  )
  const {
    data: deadlines = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useCalendarDeadlines(from, to)

  const selectedKey = formatDateOnly(selected)
  const windowEnd = formatDateOnly(windowEndDate)

  const visible = useMemo(() => {
    return deadlines.filter((item) => {
      if (kindFilter !== 'all' && item.kind !== kindFilter) {
        return false
      }
      if (listMode === 'window') {
        return item.due_on >= today && item.due_on <= windowEnd
      }
      return item.due_on === selectedKey
    })
  }, [deadlines, kindFilter, listMode, selectedKey, today, windowEnd])

  const markedDates = useMemo(
    () =>
      deadlines
        .map((item) => parseDateOnly(item.due_on))
        .filter((date): date is Date => Boolean(date)),
    [deadlines],
  )

  return (
    <section className="space-y-6">
      <PageHeader
        title={t('deadlines.title')}
        description={t('deadlines.description')}
      />

      <QueryState
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        isRetrying={isFetching}
        loadingMessage={t('common.loading')}
        errorMessage={t('deadlines.loadFailed')}
      >
        <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
          <Card className="w-fit">
            <CardContent className="p-3">
              <Calendar
                mode="single"
                dir={dir}
                locale={locale === 'ar' ? ar : enUS}
                month={month}
                onMonthChange={setMonth}
                selected={selected}
                onSelect={(date) => {
                  if (!date) {
                    return
                  }
                  setSelected(date)
                  setListMode('day')
                }}
                modifiers={{ deadline: markedDates }}
                classNames={{
                  day: 'relative p-0',
                }}
                modifiersClassNames={{
                  deadline:
                    'after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-primary',
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-3">
              <CardTitle>
                {listMode === 'window'
                  ? t('deadlines.nextSevenDays')
                  : t('deadlines.forDate', {
                      date: formatLocalizedDate(selectedKey, locale),
                    })}
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                {KIND_FILTERS.map((kind) => (
                  <Button
                    key={kind}
                    type="button"
                    size="sm"
                    variant={kindFilter === kind ? 'default' : 'outline'}
                    onClick={() => setKindFilter(kind)}
                  >
                    {t(`deadlines.kinds.${kind}`)}
                  </Button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant={listMode === 'window' ? 'default' : 'outline'}
                  onClick={() => setListMode('window')}
                >
                  {t('deadlines.nextSevenDays')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {visible.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('deadlines.empty')}
                </p>
              ) : (
                visible.map((item) => {
                  const overdue =
                    item.due_on < today &&
                    item.status !== 'done' &&
                    item.status !== 'completed'
                  return (
                    <Link
                      key={`${item.kind}-${item.id}`}
                      to={deadlineHref(item.project_id)}
                      className={cn(
                        'block rounded-lg border p-3 text-sm transition-colors hover:bg-muted/40',
                        overdue && 'border-destructive/40',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{item.title}</p>
                          <p className="truncate text-muted-foreground">
                            {item.project_code} · {item.project_title}
                          </p>
                        </div>
                        <Badge variant={overdue ? 'destructive' : 'secondary'}>
                          {t(`deadlines.kinds.${item.kind}`)}
                        </Badge>
                      </div>
                    </Link>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </QueryState>
    </section>
  )
}
