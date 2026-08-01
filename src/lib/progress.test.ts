import { describe, expect, it } from 'vitest'
import {
  calculatePhaseProgress,
  calculateProjectProgress,
  progressPercentForStatus,
} from '@/lib/progress'
import {
  calculatePhaseMetrics,
  deriveProjectFieldHealth,
  financialDeviation,
  sumPhaseCostsByCategory,
} from '@/lib/phase-metrics'

describe('progress weighted by task weights', () => {
  it('calculates phase progress from weight × progress', () => {
    const progress = calculatePhaseProgress([
      { weight_percent: 60, progress_percent: 100 },
      { weight_percent: 40, progress_percent: 50 },
    ])
    expect(progress).toBe(80)
  })

  it('rolls up project progress using phase weights', () => {
    const progress = calculateProjectProgress(
      [
        { id: 'p1', weight_percent: 50 },
        { id: 'p2', weight_percent: 50 },
      ],
      [
        {
          phase_id: 'p1',
          weight_percent: 100,
          progress_percent: 100,
        },
        {
          phase_id: 'p2',
          weight_percent: 100,
          progress_percent: 0,
        },
      ],
    )
    expect(progress).toBe(50)
  })

  it('maps status to progress defaults', () => {
    expect(progressPercentForStatus('done')).toBe(100)
    expect(progressPercentForStatus('todo')).toBe(0)
    expect(progressPercentForStatus('in_progress', 30)).toBe(30)
    expect(progressPercentForStatus('blocked')).toBe(50)
  })
})

describe('phase metrics', () => {
  it('sums costs by category and financial deviation', () => {
    const costs = sumPhaseCostsByCategory([
      { actual_cost: 100, cost_category: 'raw_material' },
      { actual_cost: 40, cost_category: 'non_raw_material' },
    ])
    expect(costs).toEqual({
      rawMaterial: 100,
      nonRawMaterial: 40,
      total: 140,
    })
    expect(financialDeviation(100, 140)).toBe(40)
  })

  it('detects schedule and budget health', () => {
    const health = deriveProjectFieldHealth(
      [
        {
          id: 'ph1',
          start_date: '2026-01-01',
          end_date: '2026-01-10',
          actual_end_date: '2026-01-15',
          expected_budget: 100,
        },
      ],
      [
        {
          phase_id: 'ph1',
          weight_percent: 100,
          progress_percent: 100,
          actual_duration_days: 15,
          actual_cost: 150,
          cost_category: 'raw_material',
        },
      ],
    )
    expect(health).toBe('delayed_and_over_budget')
  })

  it('builds full phase metrics', () => {
    const metrics = calculatePhaseMetrics(
      {
        start_date: '2026-01-01',
        end_date: '2026-01-10',
        actual_end_date: null,
        expected_budget: 200,
      },
      [
        {
          weight_percent: 100,
          progress_percent: 50,
          actual_duration_days: 12,
          actual_cost: 180,
          cost_category: 'non_raw_material',
        },
      ],
    )
    expect(metrics.plannedDurationDays).toBe(10)
    expect(metrics.actualDurationDays).toBe(12)
    expect(metrics.scheduleDeviationDays).toBe(2)
    expect(metrics.financialDeviation).toBe(-20)
    expect(metrics.progressPercent).toBe(50)
  })
})
