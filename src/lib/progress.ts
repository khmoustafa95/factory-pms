import type { Phase, Task } from '@/types/database'

export function calculatePhaseProgress(tasks: Task[]): number {
  if (tasks.length === 0) {
    return 0
  }

  const completed = tasks.filter((task) => task.status === 'done').length
  return (completed / tasks.length) * 100
}

export function calculateProjectProgress(
  phases: Phase[],
  tasks: Task[],
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
