import { differenceInCalendarDays, parseISO } from 'date-fns'
import { getPhaseDurationDays } from '@/lib/duration'
import { calculatePhaseProgress } from '@/lib/progress'
import type {
  CostCategory,
  FieldHealthStatus,
  Phase,
  Task,
} from '@/types/database'

export interface PhaseCostBreakdown {
  rawMaterial: number
  nonRawMaterial: number
  total: number
}

export interface PhaseMetrics {
  plannedDurationDays: number | null
  actualDurationDays: number
  scheduleDeviationDays: number | null
  expectedBudget: number
  costs: PhaseCostBreakdown
  financialDeviation: number
  progressPercent: number
  hasScheduleDeviation: boolean
  hasFinancialDeviation: boolean
}

type PhaseInput = Pick<
  Phase,
  'id' | 'start_date' | 'end_date' | 'actual_end_date' | 'expected_budget'
> & { actual_budget?: number | null }

type TaskMetricsInput = Pick<
  Task,
  | 'phase_id'
  | 'weight_percent'
  | 'progress_percent'
  | 'actual_duration_days'
  | 'actual_cost'
  | 'cost_category'
>

export function sumPhaseActualDuration(
  tasks: Array<Pick<Task, 'actual_duration_days'>>,
): number {
  return tasks.reduce(
    (sum, task) => sum + Number(task.actual_duration_days ?? 0),
    0,
  )
}

export function sumPhaseCostsByCategory(
  tasks: Array<Pick<Task, 'actual_cost' | 'cost_category'>>,
): PhaseCostBreakdown {
  const breakdown = tasks.reduce(
    (acc, task) => {
      const amount = Number(task.actual_cost ?? 0)
      if (task.cost_category === 'raw_material') {
        acc.rawMaterial += amount
      } else {
        acc.nonRawMaterial += amount
      }
      return acc
    },
    { rawMaterial: 0, nonRawMaterial: 0 },
  )

  return {
    ...breakdown,
    total: breakdown.rawMaterial + breakdown.nonRawMaterial,
  }
}

export function scheduleDeviationDays(
  phase: Pick<Phase, 'start_date' | 'end_date' | 'actual_end_date'>,
  tasks: Array<Pick<Task, 'actual_duration_days' | 'progress_percent'>>,
): number | null {
  const plannedDuration =
    phase.start_date && phase.end_date
      ? getPhaseDurationDays(phase.start_date, phase.end_date)
      : null

  if (phase.actual_end_date && phase.end_date) {
    return differenceInCalendarDays(
      parseISO(phase.actual_end_date),
      parseISO(phase.end_date),
    )
  }

  if (plannedDuration == null) {
    return null
  }

  const actualDuration = sumPhaseActualDuration(tasks)
  if (
    actualDuration === 0 &&
    tasks.every((task) => Number(task.progress_percent) === 0)
  ) {
    return null
  }

  return actualDuration - plannedDuration
}

export function financialDeviation(
  expectedBudget: number,
  actualTotal: number,
): number {
  return actualTotal - Number(expectedBudget ?? 0)
}

export function calculatePhaseMetrics(
  phase: Pick<
    Phase,
    'start_date' | 'end_date' | 'actual_end_date' | 'expected_budget'
  > & { actual_budget?: number | null },
  tasks: Array<
    Pick<
      Task,
      | 'weight_percent'
      | 'progress_percent'
      | 'actual_duration_days'
      | 'actual_cost'
      | 'cost_category'
    >
  >,
): PhaseMetrics {
  const plannedDurationDays =
    phase.start_date && phase.end_date
      ? getPhaseDurationDays(phase.start_date, phase.end_date)
      : null
  const actualDurationDays = sumPhaseActualDuration(tasks)
  const costs = sumPhaseCostsByCategory(tasks)
  const expectedBudget = Number(phase.expected_budget ?? 0)
  const actualTotal =
    phase.actual_budget != null ? Number(phase.actual_budget) : costs.total
  const deviationSchedule = scheduleDeviationDays(phase, tasks)
  const deviationFinancial = financialDeviation(expectedBudget, actualTotal)

  return {
    plannedDurationDays,
    actualDurationDays,
    scheduleDeviationDays: deviationSchedule,
    expectedBudget,
    costs,
    financialDeviation: deviationFinancial,
    progressPercent: calculatePhaseProgress(tasks),
    hasScheduleDeviation:
      deviationSchedule != null && Math.abs(deviationSchedule) > 0,
    hasFinancialDeviation: Math.abs(deviationFinancial) > 0.009,
  }
}

export function deriveProjectFieldHealth(
  phases: PhaseInput[],
  tasks: TaskMetricsInput[],
): FieldHealthStatus {
  let delayed = false
  let overBudget = false

  for (const phase of phases) {
    const phaseTasks = tasks.filter((task) => task.phase_id === phase.id)
    const metrics = calculatePhaseMetrics(phase, phaseTasks)
    if (
      metrics.hasScheduleDeviation &&
      (metrics.scheduleDeviationDays ?? 0) > 0
    ) {
      delayed = true
    }
    if (metrics.hasFinancialDeviation && metrics.financialDeviation > 0) {
      overBudget = true
    }
  }

  if (delayed && overBudget) {
    return 'delayed_and_over_budget'
  }
  if (delayed) {
    return 'delayed'
  }
  if (overBudget) {
    return 'over_budget'
  }
  return 'on_track'
}

export function isCostCategory(value: string): value is CostCategory {
  return value === 'raw_material' || value === 'non_raw_material'
}
