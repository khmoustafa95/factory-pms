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
import type { Phase } from '@/types/database'

interface ProjectWbsTabProps {
  phases: Phase[]
  tasksByPhase: Map<string, TaskListItem[]>
  canManage: boolean
  remainingWeight: number
  totalWeight: number
  weightsValid: boolean
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
  canManage,
  remainingWeight,
  totalWeight,
  weightsValid,
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
            {canManage ? t('wbs.manageDescription') : t('wbs.viewDescription')}
          </CardDescription>
        </div>
        {canManage ? (
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

        {phases.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('wbs.noPhases')}
          </p>
        ) : (
          <div className="space-y-4">
            {phases.map((phase) => {
              const phaseTasks = tasksByPhase.get(phase.id) ?? []

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
                    {canManage ? (
                      <div className="flex gap-2">
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
                        <Button
                          size="sm"
                          onClick={() => onCreateTask(phase.id)}
                        >
                          <Plus className="size-4" />
                          {t('common.addTask')}
                        </Button>
                      </div>
                    ) : null}
                  </CardHeader>
                  <CardContent>
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
                              <TableHead>{t('common.status')}</TableHead>
                              <TableHead>{t('wbs.assignee')}</TableHead>
                              <TableHead>{t('wbs.dueDate')}</TableHead>
                              {canManage ? (
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
                                {canManage ? (
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
