import { ProgressBar } from '@/components/progress/ProgressBar'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useTranslation } from '@/contexts/LocaleContext'
import type { TaskListItem } from '@/hooks/useTasks'
import {
  calculatePhaseProgress,
  calculateProjectProgress,
} from '@/lib/progress'
import { deriveProjectFieldHealth } from '@/lib/phase-metrics'
import type { FieldHealthStatus, Phase } from '@/types/database'

interface ProjectProgressOverviewProps {
  phases: Phase[]
  tasks: TaskListItem[]
}

const HEALTH_VARIANT: Record<
  FieldHealthStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  on_track: 'secondary',
  delayed: 'destructive',
  over_budget: 'destructive',
  delayed_and_over_budget: 'destructive',
}

export function ProjectProgressOverview({
  phases,
  tasks,
}: ProjectProgressOverviewProps) {
  const { t } = useTranslation()
  const projectProgress = calculateProjectProgress(phases, tasks)
  const fieldHealth = deriveProjectFieldHealth(phases, tasks)

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>{t('progress.title')}</CardTitle>
          <CardDescription>{t('progress.description')}</CardDescription>
        </div>
        <Badge variant={HEALTH_VARIANT[fieldHealth]}>
          {t(`progress.fieldHealth.${fieldHealth}`)}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        <ProgressBar label={t('progress.overall')} value={projectProgress} />

        {phases.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('progress.noPhases')}
          </p>
        ) : (
          <div className="space-y-4">
            {phases.map((phase) => {
              const phaseTasks = tasks.filter(
                (task) => task.phase_id === phase.id,
              )
              const phaseProgress = calculatePhaseProgress(phaseTasks)
              const doneCount = phaseTasks.filter(
                (task) => task.status === 'done',
              ).length

              return (
                <div key={phase.id} className="space-y-1">
                  <ProgressBar
                    label={`${phase.name} (${phase.weight_percent}%)`}
                    value={phaseProgress}
                  />
                  <p className="text-start text-xs text-muted-foreground">
                    {t('progress.tasksComplete', {
                      done: doneCount,
                      total: phaseTasks.length,
                    })}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
