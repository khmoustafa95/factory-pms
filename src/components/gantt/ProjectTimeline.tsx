import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useTranslation } from '@/contexts/LocaleContext'
import type { ProjectDetail } from '@/hooks/useProject'
import { formatLocalizedDate } from '@/lib/i18n-format'
import type { Phase } from '@/types/database'

interface ProjectTimelineProps {
  project: ProjectDetail
  phases: Phase[]
}

function getTimelineRange(project: ProjectDetail) {
  const start =
    project.actual_start_date ??
    project.proposed_start_date ??
    format(new Date(), 'yyyy-MM-dd')
  const end =
    project.actual_end_date ??
    project.proposed_end_date ??
    format(new Date(Date.now() + 1000 * 60 * 60 * 24 * 90), 'yyyy-MM-dd')

  const startDate = parseISO(start)
  const endDate = parseISO(end)
  const totalDays = Math.max(differenceInCalendarDays(endDate, startDate), 1)

  return { startDate, endDate, totalDays, start, end }
}

export function ProjectTimeline({ project, phases }: ProjectTimelineProps) {
  const { t, locale } = useTranslation()
  const { totalDays, start, end } = getTimelineRange(project)

  if (phases.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('timeline.title')}</CardTitle>
          <CardDescription>{t('timeline.emptyDescription')}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const segmentWidth = 100 / phases.length
  const startLabel = formatLocalizedDate(start, locale)
  const endLabel = formatLocalizedDate(end, locale)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('timeline.title')}</CardTitle>
        <CardDescription>
          {startLabel} → {endLabel} ({totalDays}) — {t('timeline.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="relative h-3 overflow-hidden rounded-full bg-muted">
          {phases.map((phase, index) => (
            <div
              key={phase.id}
              className="absolute top-0 h-full bg-primary first:rounded-l-full last:rounded-r-full"
              style={{
                left: `${index * segmentWidth}%`,
                width: `${segmentWidth}%`,
                opacity: 0.45 + (index % 3) * 0.15,
              }}
              title={phase.name}
            />
          ))}
        </div>

        <div className="space-y-3">
          {phases.map((phase, index) => {
            const leftPercent = index * segmentWidth

            return (
              <div key={phase.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{phase.name}</span>
                  <span className="text-muted-foreground">
                    {phase.weight_percent}%
                  </span>
                </div>
                <div className="relative h-8 rounded-md bg-muted">
                  <div
                    className="absolute top-1 bottom-1 rounded bg-primary"
                    style={{
                      left: `${leftPercent}%`,
                      width: `${segmentWidth}%`,
                    }}
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
