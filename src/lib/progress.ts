import type { Phase, Task } from '@/types/database'

export function calculatePhaseProgress(
  tasks: Array<Pick<Task, 'weight_percent' | 'progress_percent'>>,
): number {
  if (tasks.length === 0) {
    return 0
  }

  return tasks.reduce((total, task) => {
    return (
      total +
      (Number(task.weight_percent) / 100) * Number(task.progress_percent)
    )
  }, 0)
}

export function calculateProjectProgress(
  phases: Array<Pick<Phase, 'id' | 'weight_percent'>>,
  tasks: Array<Pick<Task, 'phase_id' | 'weight_percent' | 'progress_percent'>>,
): number {
  if (phases.length === 0) {
    return 0
  }

  return phases.reduce((total, phase) => {
    const phaseTasks = tasks.filter((task) => task.phase_id === phase.id)
    const phaseProgress = calculatePhaseProgress(phaseTasks)
    return total + (Number(phase.weight_percent) / 100) * phaseProgress
  }, 0)
}

export function formatProgress(value: number): string {
  return `${Math.round(value)}%`
}

export function progressPercentForStatus(
  status: Task['status'],
  currentProgress?: number,
): number {
  if (status === 'done') {
    return 100
  }
  if (status === 'todo') {
    return 0
  }
  if (currentProgress != null && currentProgress > 0 && currentProgress < 100) {
    return currentProgress
  }
  return 50
}
