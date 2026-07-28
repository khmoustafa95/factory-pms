import {
  differenceInCalendarDays,
  format,
  isWithinInterval,
  parseISO,
} from 'date-fns'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useTranslation } from '@/contexts/LocaleContext'
import type { ProjectDetail } from '@/hooks/useProject'
import { formatLocalizedDate, getPhaseStatusLabel } from '@/lib/i18n-format'
import { getProjectScheduleBounds } from '@/lib/duration'
import type { Phase } from '@/types/database'

interface ProjectTimelineProps {
  project: ProjectDetail
  phases: Phase[]
}

const PHASE_COLORS = [
  'bg-primary/80',
  'bg-primary/60',
  'bg-primary/45',
  'bg-primary/35',
  'bg-primary/25',
]

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
    width: `${Math.max(widthPercent, 2)}%`,
  }
}

export function ProjectTimeline({ project, phases }: ProjectTimelineProps) {
  const { t, locale } = useTranslation()
  const schedule = getProjectScheduleBounds(project)
  const phasesWithDates = phases.filter(
    (phase) => phase.start_date && phase.end_date,
  )

  if (!schedule.start || !schedule.end) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('timeline.title')}</CardTitle>
          <CardDescription>{t('timeline.noProjectSchedule')}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (phasesWithDates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('timeline.title')}</CardTitle>
          <CardDescription>{t('timeline.emptyDescription')}</CardDescription>
        </CardHeader>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('timeline.title')}</CardTitle>
        <CardDescription>
          {startLabel} → {endLabel} ({totalDays} {t('timeline.days')}) —{' '}
          {t('timeline.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="hidden overflow-x-auto sm:block">
          <div className="min-w-120 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{startLabel}</span>
              <span>{endLabel}</span>
            </div>
            <div className="relative h-4 overflow-hidden rounded-full bg-muted">
              {todayOffset != null ? (
                <div
                  className="absolute top-0 bottom-0 z-10 w-0.5 bg-destructive"
                  style={{ insetInlineStart: `${todayOffset}%` }}
                  title={t('timeline.today')}
                />
              ) : null}
              {phasesWithDates.map((phase, index) => (
                <div
                  key={phase.id}
                  className={`absolute top-0.5 bottom-0.5 rounded-full ${PHASE_COLORS[index % PHASE_COLORS.length]}`}
                  style={getBarStyle(
                    phase.start_date!,
                    phase.end_date!,
                    rangeStart,
                    totalDays,
                  )}
                  title={phase.name}
                />
              ))}
            </div>
            {todayInRange ? (
              <p className="text-xs text-muted-foreground">
                {t('timeline.today')}: {formatLocalizedDate(today, locale)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          {phasesWithDates.map((phase, index) => {
            const barStyle = getBarStyle(
              phase.start_date!,
              phase.end_date!,
              rangeStart,
              totalDays,
            )

            return (
              <div
                key={phase.id}
                className="rounded-lg border border-border bg-card p-3 sm:border-0 sm:bg-transparent sm:p-0"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="space-y-1">
                    <span className="text-sm font-medium">{phase.name}</span>
                    <p className="text-xs text-muted-foreground">
                      {formatLocalizedDate(phase.start_date, locale)} →{' '}
                      {formatLocalizedDate(phase.end_date, locale)} ·{' '}
                      {getPhaseStatusLabel(t, phase.status)} ·{' '}
                      {phase.weight_percent}%
                    </p>
                  </div>
                </div>
                <div className="relative mt-2 hidden h-8 rounded-md bg-muted sm:block">
                  <div
                    className={`absolute top-1 bottom-1 rounded ${PHASE_COLORS[index % PHASE_COLORS.length]}`}
                    style={barStyle}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
