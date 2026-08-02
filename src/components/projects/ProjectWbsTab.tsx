import { Layers, Plus, Trash2 } from 'lucide-react'
import { ResponsiveTable } from '@/components/ResponsiveTable'
import { StatusMessage } from '@/components/StatusMessage'
import { TaskStatusBadge } from '@/components/tasks/TaskStatusBadge'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useTranslation } from '@/contexts/LocaleContext'
import type { TaskListItem } from '@/hooks/useTasks'
import { formatLocalizedDate, getPhaseStatusLabel } from '@/lib/i18n-format'
import { calculatePhaseMetrics } from '@/lib/phase-metrics'
import { isTaskWeightSumValid, sumTaskWeights } from '@/lib/wbs'
import type { Phase } from '@/types/database'

interface ProjectWbsTabProps {
  phases: Phase[]
  tasksByPhase: Map<string, TaskListItem[]>
  canManagePhases: boolean
  canManageTasks: boolean
  remainingWeight: number
  totalWeight: number
  weightsValid: boolean
  remainingBudget: number
  totalBudget: number
  budgetValid: boolean
  projectBudget: number | null | undefined
  onCreatePhase: () => void
  onEditPhase: (phase: Phase) => void
  onDeletePhase: (phase: Phase) => void
  onCreateTask: (phaseId: string) => void
  onEditTask: (task: TaskListItem) => void
  onDeleteTask: (task: TaskListItem) => void
}

export function ProjectWbsTab({
  phases,
  tasksByPhase,
  canManagePhases,
  canManageTasks,
  remainingWeight,
  totalWeight,
  weightsValid,
  remainingBudget,
  totalBudget,
  budgetValid,
  projectBudget,
  onCreatePhase,
  onEditPhase,
  onDeletePhase,
  onCreateTask,
  onEditTask,
  onDeleteTask,
}: ProjectWbsTabProps) {
  const { t, locale } = useTranslation()

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Layers className="size-5" />
            {t('wbs.title')}
          </CardTitle>
          <CardDescription>
            {canManagePhases
              ? t('wbs.manageDescription')
              : t('wbs.viewDescription')}
          </CardDescription>
        </div>
        {canManagePhases ? (
          <Button onClick={onCreatePhase} disabled={remainingWeight <= 0}>
            <Plus className="size-4" />
            {t('common.addPhase')}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {weightsValid ? (
          <StatusMessage variant="info">
            {t('wbs.weightSummary', { total: totalWeight.toFixed(1) })}
          </StatusMessage>
        ) : (
          <StatusMessage variant="warning">
            {t('wbs.weightInvalid')}{' '}
            {t('wbs.weightSummary', { total: totalWeight.toFixed(1) })}
          </StatusMessage>
        )}

        {budgetValid ? (
          <StatusMessage variant="info">
            {t('wbs.budgetSummary', {
              total: totalBudget.toFixed(2),
              projectBudget: (projectBudget ?? 0).toFixed(2),
            })}
            {' · '}
            {t('wbs.remainingBudget', {
              remaining: remainingBudget.toFixed(2),
            })}
          </StatusMessage>
        ) : (
          <StatusMessage variant="warning">
            {t('wbs.budgetInvalid')}{' '}
            {t('wbs.budgetSummary', {
              total: totalBudget.toFixed(2),
              projectBudget: (projectBudget ?? 0).toFixed(2),
            })}
            {' · '}
            {t('wbs.remainingBudget', {
              remaining: remainingBudget.toFixed(2),
            })}
          </StatusMessage>
        )}

        {phases.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('wbs.noPhases')}
          </p>
        ) : (
          <div className="space-y-4">
            {phases.map((phase) => {
              const phaseTasks = tasksByPhase.get(phase.id) ?? []
              const metrics = calculatePhaseMetrics(phase, phaseTasks)
              const taskWeightTotal = sumTaskWeights(phaseTasks)
              const taskWeightsValid = isTaskWeightSumValid(phaseTasks)

              return (
                <Card key={phase.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
                    <div className="space-y-1">
                      <CardTitle className="text-base">
                        {phase.name}{' '}
                        <Badge variant="outline">{phase.weight_percent}%</Badge>
                      </CardTitle>
                      <CardDescription>
                        {getPhaseStatusLabel(t, phase.status)}
                        {phase.start_date && phase.end_date
                          ? ` · ${formatLocalizedDate(phase.start_date, locale)} → ${formatLocalizedDate(phase.end_date, locale)}`
                          : ''}
                        {phase.description ? ` — ${phase.description}` : ''}
                      </CardDescription>
                    </div>
                    {canManagePhases || canManageTasks ? (
                      <div className="flex gap-2">
                        {canManagePhases ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onEditPhase(phase)}
                            >
                              {t('common.edit')}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void onDeletePhase(phase)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </>
                        ) : null}
                        {canManageTasks ? (
                          <Button
                            size="sm"
                            onClick={() => onCreateTask(phase.id)}
                            disabled={
                              phaseTasks.length > 0 &&
                              remainingTaskCreateDisabled(phaseTasks)
                            }
                          >
                            <Plus className="size-4" />
                            {t('common.addTask')}
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <MetricLine
                        label={t('wbs.plannedDuration')}
                        value={
                          metrics.plannedDurationDays != null
                            ? t('wbs.daysValue', {
                                days: metrics.plannedDurationDays,
                              })
                            : t('common.notAvailable')
                        }
                      />
                      <MetricLine
                        label={t('wbs.actualDuration')}
                        value={t('wbs.daysValue', {
                          days: metrics.actualDurationDays,
                        })}
                      />
                      <MetricLine
                        label={t('wbs.scheduleDeviation')}
                        value={
                          metrics.scheduleDeviationDays != null
                            ? t('wbs.daysValueSigned', {
                                days: metrics.scheduleDeviationDays,
                              })
                            : t('common.notAvailable')
                        }
                        warn={
                          metrics.hasScheduleDeviation &&
                          (metrics.scheduleDeviationDays ?? 0) > 0
                        }
                      />
                      <MetricLine
                        label={t('wbs.phaseProgress')}
                        value={`${Math.round(metrics.progressPercent)}%`}
                      />
                      <MetricLine
                        label={t('wbs.expectedBudget')}
                        value={metrics.expectedBudget.toFixed(2)}
                      />
                      <MetricLine
                        label={t('wbs.actualCost')}
                        value={metrics.actualCost.toFixed(2)}
                      />
                      <MetricLine
                        label={t('wbs.financialDeviation')}
                        value={metrics.financialDeviation.toFixed(2)}
                        warn={
                          metrics.hasFinancialDeviation &&
                          metrics.financialDeviation > 0
                        }
                      />
                    </div>

                    {phase.schedule_deviation_reason ? (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {t('wbs.scheduleDeviationReason')}:{' '}
                        </span>
                        {phase.schedule_deviation_reason}
                      </p>
                    ) : null}

                    {phase.financial_deviation_reason ? (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {t('wbs.financialDeviationReason')}:{' '}
                        </span>
                        {phase.financial_deviation_reason}
                      </p>
                    ) : null}

                    {phase.problem_description ? (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {t('wbs.problemDescription')}:{' '}
                        </span>
                        {phase.problem_description}
                        {phase.solution_in_progress
                          ? ` · ${t('wbs.solutionInProgress')}: ${phase.solution_in_progress}`
                          : ''}
                      </p>
                    ) : null}

                    {phaseTasks.length > 0 && !taskWeightsValid ? (
                      <StatusMessage variant="warning">
                        {t('wbs.taskWeightInvalid')}{' '}
                        {t('wbs.taskWeightSummary', {
                          total: taskWeightTotal.toFixed(1),
                        })}
                      </StatusMessage>
                    ) : null}

                    {phaseTasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {t('wbs.noTasks')}
                      </p>
                    ) : (
                      <ResponsiveTable>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t('wbs.tasks')}</TableHead>
                              <TableHead>{t('wbs.taskWeight')}</TableHead>
                              <TableHead>{t('wbs.taskProgress')}</TableHead>
                              <TableHead>{t('common.status')}</TableHead>
                              <TableHead>{t('wbs.assignee')}</TableHead>
                              <TableHead>{t('wbs.dueDate')}</TableHead>
                              {canManageTasks ? (
                                <TableHead className="text-end">
                                  {t('common.actions')}
                                </TableHead>
                              ) : null}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {phaseTasks.map((task) => (
                              <TableRow key={task.id}>
                                <TableCell>
                                  <div className="space-y-1">
                                    <p className="font-medium">{task.title}</p>
                                    {task.status === 'blocked' &&
                                    task.blocked_reason ? (
                                      <p className="text-sm text-destructive">
                                        {t('wbs.blockedReason')}:{' '}
                                        {task.blocked_reason}
                                      </p>
                                    ) : null}
                                  </div>
                                </TableCell>
                                <TableCell>{task.weight_percent}%</TableCell>
                                <TableCell>
                                  {Math.round(Number(task.progress_percent))}%
                                </TableCell>
                                <TableCell>
                                  <TaskStatusBadge status={task.status} />
                                </TableCell>
                                <TableCell>
                                  {task.assignee?.full_name ??
                                    t('common.notAvailable')}
                                </TableCell>
                                <TableCell>
                                  {formatLocalizedDate(
                                    task.due_date,
                                    locale,
                                    t('common.notAvailable'),
                                  )}
                                </TableCell>
                                {canManageTasks ? (
                                  <TableCell className="text-end">
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onEditTask(task)}
                                      >
                                        {t('common.edit')}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => void onDeleteTask(task)}
                                      >
                                        <Trash2 className="size-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                ) : null}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ResponsiveTable>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MetricLine({
  label,
  value,
  warn = false,
}: {
  label: string
  value: string
  warn?: boolean
}) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          warn ? 'font-medium text-destructive' : 'font-medium text-foreground'
        }
      >
        {value}
      </p>
    </div>
  )
}

function remainingTaskCreateDisabled(
  tasks: Array<{ weight_percent: number }>,
): boolean {
  return sumTaskWeights(tasks) >= 99.99
}
