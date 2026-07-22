import { ProgressBar } from '@/components/progress/ProgressBar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  calculatePhaseProgress,
  calculateProjectProgress,
  formatProgress,
} from '@/lib/progress'
import type { Phase } from '@/types/database'
import type { TaskListItem } from '@/hooks/useTasks'

interface ProjectProgressOverviewProps {
  phases: Phase[]
  tasks: TaskListItem[]
}

export function ProjectProgressOverview({
  phases,
  tasks,
}: ProjectProgressOverviewProps) {
  const projectProgress = calculateProjectProgress(phases, tasks)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progress overview</CardTitle>
        <CardDescription>
          Weighted by phase importance. Updates as tasks move to done.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <ProgressBar label="Overall project" value={projectProgress} />

        {phases.length === 0 ? (
          <p className="text-sm text-slate-500">
            Add phases in the WBS tab to track progress.
          </p>
        ) : (
          <div className="space-y-4">
            {phases.map((phase) => {
              const phaseTasks = tasks.filter(
                (task) => task.phase_id === phase.id,
              )
              const phaseProgress = calculatePhaseProgress(phaseTasks)

              return (
                <div key={phase.id} className="space-y-1">
                  <ProgressBar
                    label={`${phase.name} (${phase.weight_percent}%)`}
                    value={phaseProgress}
                  />
                  <p className="text-xs text-slate-500">
                    {phaseTasks.filter((task) => task.status === 'done').length}
                    /{phaseTasks.length} tasks done · contributes{' '}
                    {formatProgress(
                      (Number(phase.weight_percent) / 100) * phaseProgress,
                    )}{' '}
                    to project
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
