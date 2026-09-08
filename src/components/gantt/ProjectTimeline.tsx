import {
  addDays,
  differenceInCalendarDays,
  eachMonthOfInterval,
  format,
  isWithinInterval,
  parseISO,
  startOfMonth,
} from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import { CalendarRange } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useTranslation } from '@/contexts/LocaleContext'
import type { ProjectDetail } from '@/hooks/useProject'
import { formatLocalizedDate, getPhaseStatusLabel } from '@/lib/i18n-format'
import { getProjectScheduleBounds } from '@/lib/duration'
import {
  calculatePhaseProgress,
  formatProgress,
} from '@/lib/progress'
import { cn } from '@/lib/utils'
import type { Phase, PhaseStatus, Task } from '@/types/database'

interface ProjectTimelineProps {
  project: ProjectDetail
  phases: Phase[]
  /** Tasks grouped by phase — used for actual progress on bars. */
  tasksByPhase?: Map<string, Array<Pick<Task, 'weight_percent' | 'progress_percent'>>>
  canSetSchedule?: boolean
  onSetSchedule?: () => void
  embedded?: boolean
}

type TimeTick = {
  key: string
  label: string
  percent: number
}

function getBarStyle(
  phaseStart: string,
  phaseEnd: string,
  rangeStart: Date,
  totalDays: number,
) {
  const startOffset = Math.max(
    differenceInCalendarDays(parseISO(phaseStart), rangeStart),
    0,
  )
  const phaseDays = differenceInCalendarDays(
    parseISO(phaseEnd),
    parseISO(phaseStart),
  )
  const widthDays = Math.max(phaseDays + 1, 1)
  const leftPercent = (startOffset / totalDays) * 100
  const widthPercent = Math.min(
    (widthDays / totalDays) * 100,
    100 - leftPercent,
  )

  return {
    insetInlineStart: `${leftPercent}%`,
    width: `${Math.max(widthPercent, 2.5)}%`,
  }
}

function phaseBarTrackClass(status: PhaseStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-emerald-600/30 dark:bg-emerald-500/30'
    case 'in_progress':
      return 'bg-sky-600/30 dark:bg-sky-500/30'
    case 'pending':
    default:
      return 'bg-slate-400/35 dark:bg-slate-500/35'
  }
}

function phaseBarFillClass(status: PhaseStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-emerald-600 dark:bg-emerald-500'
    case 'in_progress':
      return 'bg-sky-600 dark:bg-sky-500'
    case 'pending':
    default:
      return 'bg-slate-400 dark:bg-slate-500'
  }
}

function phaseDotClass(status: PhaseStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-emerald-600 dark:bg-emerald-500'
    case 'in_progress':
      return 'bg-sky-600 dark:bg-sky-500'
    case 'pending':
    default:
      return 'bg-slate-400 dark:bg-slate-500'
  }
}

function buildTimeTicks(
  rangeStart: Date,
  rangeEnd: Date,
  totalDays: number,
  locale: 'ar' | 'en',
): TimeTick[] {
  const dateLocale = locale === 'ar' ? ar : enUS
  const monthStarts = eachMonthOfInterval({
    start: startOfMonth(rangeStart),
    end: rangeEnd,
  }).filter((month) => month.getTime() >= rangeStart.getTime())

  if (totalDays <= 45) {
    const mid = addDays(rangeStart, Math.floor(totalDays / 2))
    return [
      {
        key: 'start',
        label: format(rangeStart, 'd MMM', { locale: dateLocale }),
        percent: 0,
      },
      {
        key: 'mid',
        label: format(mid, 'd MMM', { locale: dateLocale }),
        percent: 50,
      },
      {
        key: 'end',
        label: format(rangeEnd, 'd MMM', { locale: dateLocale }),
        percent: 100,
      },
    ]
  }

  const ticks: TimeTick[] = monthStarts.map((month) => {
    const offset = Math.max(
      differenceInCalendarDays(month, rangeStart),
      0,
    )
    return {
      key: month.toISOString(),
      label: format(month, totalDays > 370 ? 'MMM yy' : 'MMM', {
        locale: dateLocale,
      }),
      percent: Math.min((offset / totalDays) * 100, 100),
    }
  })

  const last = ticks[ticks.length - 1]
  if (!last || last.percent < 92) {
    ticks.push({
      key: 'end',
      label: format(rangeEnd, 'd MMM', { locale: dateLocale }),
      percent: 100,
    })
  }

  return ticks
}

function TodayMarker({
  offsetPercent,
  withLabel = false,
}: {
  offsetPercent: number
  withLabel?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div
      className="pointer-events-none absolute top-0 bottom-0 z-20"
      style={{ insetInlineStart: `${offsetPercent}%` }}
      aria-hidden
    >
      <div className="absolute inset-y-0 w-px -translate-x-1/2 bg-destructive rtl:translate-x-1/2" />
      {withLabel ? (
        <span className="absolute top-0 z-20 -translate-x-1/2 rounded-md bg-destructive px-1.5 py-0.5 text-[10px] font-medium text-white rtl:translate-x-1/2">
          {t('timeline.today')}
        </span>
      ) : null}
    </div>
  )
}

function StatusLegend() {
  const { t } = useTranslation()
  const items: PhaseStatus[] = ['pending', 'in_progress', 'completed']

  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {items.map((status) => (
        <li key={status} className="inline-flex items-center gap-1.5">
          <span
            className={cn('size-2.5 rounded-sm', phaseDotClass(status))}
            aria-hidden
          />
          {getPhaseStatusLabel(t, status)}
        </li>
      ))}
    </ul>
  )
}

export function ProjectTimeline({
  project,
  phases,
  tasksByPhase,
  canSetSchedule = false,
  onSetSchedule,
  embedded = false,
}: ProjectTimelineProps) {
  const { t, locale } = useTranslation()
  const schedule = getProjectScheduleBounds(project)
  const phasesWithDates = phases.filter(
    (phase) => phase.start_date && phase.end_date,
  )

  const description = !schedule.start || !schedule.end
    ? t('timeline.noProjectSchedule')
    : phasesWithDates.length === 0
      ? t('timeline.emptyDescription')
      : t('timeline.description')

  const titleBlock = (
    <div className="space-y-1">
      <h3 className="flex items-center gap-2 text-lg font-semibold leading-none tracking-tight">
        <CalendarRange className="size-5 text-muted-foreground" />
        {t('timeline.title')}
      </h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )

  if (!schedule.start || !schedule.end) {
    const action =
      canSetSchedule && onSetSchedule ? (
        <Button type="button" variant="outline" onClick={onSetSchedule}>
          {t('timeline.setScheduleAction')}
        </Button>
      ) : null

    if (embedded) {
      return (
        <div className="space-y-3 border-b border-border pb-5">
          {titleBlock}
          {action}
        </div>
      )
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarRange className="size-5 text-muted-foreground" />
            {t('timeline.title')}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {action ? <CardContent>{action}</CardContent> : null}
      </Card>
    )
  }

  const rangeStart = parseISO(schedule.start)
  const rangeEnd = parseISO(schedule.end)
  const totalDays = Math.max(
    differenceInCalendarDays(rangeEnd, rangeStart) + 1,
    1,
  )
  const today = format(new Date(), 'yyyy-MM-dd')
  const todayInRange = isWithinInterval(parseISO(today), {
    start: rangeStart,
    end: rangeEnd,
  })
  const todayOffset = todayInRange
    ? (differenceInCalendarDays(parseISO(today), rangeStart) / totalDays) * 100
    : null

  const startLabel = formatLocalizedDate(schedule.start, locale)
  const endLabel = formatLocalizedDate(schedule.end, locale)
  const ticks = buildTimeTicks(rangeStart, rangeEnd, totalDays, locale)

  const chartBody = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-normal tabular-nums">
            {startLabel} → {endLabel}
          </Badge>
          <Badge variant="secondary" className="font-normal tabular-nums">
            {totalDays} {t('timeline.days')}
          </Badge>
          {todayInRange ? (
            <Badge variant="outline" className="border-destructive/40 font-normal text-destructive">
              {t('timeline.today')}: {formatLocalizedDate(today, locale)}
            </Badge>
          ) : null}
        </div>
        <StatusLegend />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
        <div className="overflow-x-auto">
          <div className="min-w-xl">
            <div className="grid grid-cols-[9.5rem_minmax(0,1fr)] border-b border-border bg-muted/40 sm:grid-cols-[12rem_minmax(0,1fr)]">
              <div className="flex items-end border-e border-border px-3 py-2 text-xs font-medium text-muted-foreground">
                {t('timeline.phaseColumn')}
              </div>
              <div className="relative h-10 px-2">
                {ticks.map((tick) => (
                  <div
                    key={tick.key}
                    className="absolute top-0 bottom-0"
                    style={{ insetInlineStart: `${tick.percent}%` }}
                  >
                    <div className="absolute inset-y-0 w-px bg-border/80" />
                    <span
                      className={cn(
                        'absolute top-1.5 whitespace-nowrap text-[10px] font-medium text-muted-foreground',
                        tick.percent <= 2 && 'inset-s-0',
                        tick.percent >= 98 && 'inset-e-0',
                        tick.percent > 2 &&
                          tick.percent < 98 &&
                          '-translate-x-1/2 rtl:translate-x-1/2',
                      )}
                    >
                      {tick.label}
                    </span>
                  </div>
                ))}
                {todayOffset != null ? (
                  <TodayMarker offsetPercent={todayOffset} withLabel />
                ) : null}
              </div>
            </div>

            {phasesWithDates.length === 0 ? (
              <div className="grid grid-cols-[9.5rem_minmax(0,1fr)] sm:grid-cols-[12rem_minmax(0,1fr)]">
                <div className="border-e border-border px-3 py-6" />
                <div className="relative px-2 py-6">
                  <div className="flex h-10 items-center justify-center rounded-lg border border-dashed border-border bg-background/60 px-3 text-center text-sm text-muted-foreground">
                    {t('timeline.emptyTrackHint')}
                  </div>
                  {ticks.map((tick) => (
                    <div
                      key={`empty-grid-${tick.key}`}
                      className="pointer-events-none absolute inset-y-0 w-px bg-border/50"
                      style={{ insetInlineStart: `${tick.percent}%` }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <TooltipProvider delayDuration={200}>
                <ul>
                  {phasesWithDates.map((phase, index) => {
                    const barStyle = getBarStyle(
                      phase.start_date!,
                      phase.end_date!,
                      rangeStart,
                      totalDays,
                    )
                    const phaseDays =
                      differenceInCalendarDays(
                        parseISO(phase.end_date!),
                        parseISO(phase.start_date!),
                      ) + 1
                    const phaseTasks = tasksByPhase?.get(phase.id) ?? []
                    const progressPercent = Math.min(
                      100,
                      Math.max(0, calculatePhaseProgress(phaseTasks)),
                    )
                    const progressLabel = formatProgress(progressPercent)
                    const tooltipText = [
                      phase.name,
                      `${formatLocalizedDate(phase.start_date, locale)} → ${formatLocalizedDate(phase.end_date, locale)}`,
                      getPhaseStatusLabel(t, phase.status),
                      t('timeline.actualProgress', { value: progressLabel }),
                      `${phase.weight_percent}% ${t('wbs.weight')}`,
                      `${phaseDays} ${t('timeline.days')}`,
                    ].join(' · ')

                    return (
                      <li
                        key={phase.id}
                        className={cn(
                          'grid grid-cols-[9.5rem_minmax(0,1fr)] sm:grid-cols-[12rem_minmax(0,1fr)]',
                          index < phasesWithDates.length - 1 &&
                            'border-b border-border/70',
                        )}
                      >
                        <div className="flex min-w-0 flex-col justify-center gap-0.5 border-e border-border bg-background/40 px-3 py-3">
                          <span className="truncate text-sm font-medium leading-tight">
                            {phase.name}
                          </span>
                          <span className="truncate text-[11px] text-muted-foreground">
                            {getPhaseStatusLabel(t, phase.status)} ·{' '}
                            {progressLabel}
                          </span>
                        </div>
                        <div className="relative px-2 py-3">
                          {ticks.map((tick) => (
                            <div
                              key={`${phase.id}-grid-${tick.key}`}
                              className="pointer-events-none absolute inset-y-0 w-px bg-border/40"
                              style={{
                                insetInlineStart: `${tick.percent}%`,
                              }}
                            />
                          ))}
                          {todayOffset != null ? (
                            <TodayMarker offsetPercent={todayOffset} />
                          ) : null}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="relative h-8 rounded-md bg-muted/70 ring-1 ring-inset ring-border/50">
                                <div
                                  className={cn(
                                    'absolute top-1 bottom-1 overflow-hidden rounded-md shadow-sm',
                                    phaseBarTrackClass(phase.status),
                                  )}
                                  style={barStyle}
                                >
                                  <div
                                    className={cn(
                                      'absolute inset-y-0 inset-s-0 transition-[width]',
                                      phaseBarFillClass(phase.status),
                                    )}
                                    style={{
                                      width: `${progressPercent}%`,
                                    }}
                                  />
                                  <div className="relative z-10 flex h-full items-center justify-between gap-2 px-2">
                                    <span className="rounded-sm bg-black/25 px-1 py-px text-[10px] font-semibold tabular-nums text-white">
                                      {progressLabel}
                                    </span>
                                    <span className="shrink-0 rounded-sm bg-black/20 px-1 py-px text-[10px] font-medium tabular-nums text-white/95">
                                      {phaseDays} {t('timeline.days')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent
                              sideOffset={6}
                              className="max-w-xs text-start"
                            >
                              {tooltipText}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  if (embedded) {
    return (
      <div className="space-y-4 border-b border-border pb-5">
        {titleBlock}
        {chartBody}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarRange className="size-5 text-muted-foreground" />
          {t('timeline.title')}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{chartBody}</CardContent>
    </Card>
  )
}
