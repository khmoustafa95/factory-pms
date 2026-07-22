import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { Phase } from '@/types/database'
import type { ProjectDetail } from '@/hooks/useProject'

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

  return { startDate, endDate, totalDays }
}

export function ProjectTimeline({ project, phases }: ProjectTimelineProps) {
  const { startDate, endDate, totalDays } = getTimelineRange(project)

  if (phases.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
          <CardDescription>
            Add phases to visualize the project schedule.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const segmentWidth = 100 / phases.length

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
        <CardDescription>
          {format(startDate, 'dd MMM yyyy')} → {format(endDate, 'dd MMM yyyy')}{' '}
          ({totalDays} days) — phases distributed across the project window.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="relative h-3 overflow-hidden rounded-full bg-slate-200">
          {phases.map((phase, index) => (
            <div
              key={phase.id}
              className="absolute top-0 h-full bg-slate-700 first:rounded-l-full last:rounded-r-full"
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
                  <span className="text-slate-500">
                    {phase.weight_percent}%
                  </span>
                </div>
                <div className="relative h-8 rounded-md bg-slate-100">
                  <div
                    className="absolute top-1 bottom-1 rounded bg-slate-800"
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
