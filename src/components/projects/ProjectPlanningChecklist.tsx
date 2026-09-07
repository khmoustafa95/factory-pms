import { Circle, CircleCheck, ListChecks } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useTranslation } from '@/contexts/LocaleContext'
import { cn } from '@/lib/utils'

interface ProjectPlanningChecklistProps {
  phasesReady: boolean
  tasksPrepared: boolean
  canManagePhases: boolean
  canManageTasks: boolean
  canStart: boolean
  onGoToWbs: () => void
  onStart: () => void
}

export function ProjectPlanningChecklist({
  phasesReady,
  tasksPrepared,
  canManagePhases,
  canManageTasks,
  canStart,
  onGoToWbs,
  onStart,
}: ProjectPlanningChecklistProps) {
  const { t } = useTranslation()

  const steps = [
    {
      id: 'phases',
      done: phasesReady,
      title: t('projects.planning.stepPhases'),
      hint: phasesReady
        ? t('projects.planning.done')
        : canManagePhases
          ? t('projects.planning.phasesHintFm')
          : t('projects.planning.waitingFm'),
      action:
        !phasesReady && canManagePhases
          ? {
              label: t('projects.planning.ctaAddPhase'),
              onClick: onGoToWbs,
            }
          : null,
    },
    {
      id: 'tasks',
      done: tasksPrepared,
      title: t('projects.planning.stepTasks'),
      hint: !phasesReady
        ? t('projects.planning.waitingFm')
        : tasksPrepared
          ? t('projects.planning.done')
          : canManageTasks
            ? t('projects.planning.tasksHintPm')
            : t('projects.planning.waitingPm'),
      action:
        phasesReady && !tasksPrepared && canManageTasks
          ? {
              label: t('projects.planning.ctaAddTask'),
              onClick: onGoToWbs,
            }
          : null,
    },
    {
      id: 'start',
      done: false,
      title: t('projects.planning.stepStart'),
      hint: phasesReady
        ? canStart
          ? t('projects.planning.startHintFm')
          : t('projects.planning.waitingFm')
        : t('projects.planning.waitingFm'),
      action: canStart
        ? {
            label: t('projects.planning.ctaStart'),
            onClick: onStart,
          }
        : null,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ListChecks className="size-5" />
          {t('projects.planning.title')}
        </CardTitle>
        <CardDescription>{t('projects.planning.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step) => {
          const Icon = step.done ? CircleCheck : Circle
          return (
            <div
              key={step.id}
              className="flex flex-col gap-2 rounded-md border border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <Icon
                  className={cn(
                    'mt-0.5 size-5 shrink-0',
                    step.done ? 'text-primary' : 'text-muted-foreground',
                  )}
                  aria-hidden
                />
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-sm text-muted-foreground">{step.hint}</p>
                </div>
              </div>
              {step.action ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={step.action.onClick}
                >
                  {step.action.label}
                </Button>
              ) : null}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
