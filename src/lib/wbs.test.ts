import { describe, expect, it } from 'vitest'
import {
  canStartExecution,
  getExecutionReadiness,
  isPhaseBudgetSumValid,
  remainingPhaseBudget,
} from '@/lib/wbs'

describe('execution readiness', () => {
  const baseProject = {
    status: 'approved' as const,
    budget: 1000,
    proposed_start_date: '2026-01-01',
    proposed_end_date: '2026-03-31',
    proposed_duration_value: 90,
    proposed_duration_unit: 'day' as const,
    actual_start_date: null,
    actual_end_date: null,
  }

  it('requires phases totaling 100% weight and budget', () => {
    const notReady = getExecutionReadiness(baseProject, [
      {
        start_date: '2026-01-01',
        end_date: '2026-02-01',
        weight_percent: 50,
        expected_budget: 500,
      },
    ])
    expect(notReady.ready).toBe(false)
    expect(notReady.reasons).toContain('weights_incomplete')

    const ready = getExecutionReadiness(baseProject, [
      {
        start_date: '2026-01-01',
        end_date: '2026-02-15',
        weight_percent: 60,
        expected_budget: 600,
      },
      {
        start_date: '2026-02-16',
        end_date: '2026-03-31',
        weight_percent: 40,
        expected_budget: 400,
      },
    ])
    expect(ready.ready).toBe(true)
  })

  it('allows only factory manager of the same factory to start', () => {
    expect(
      canStartExecution(
        { status: 'approved', factory_id: 'f1' },
        { id: 'u1', role: 'factory_manager', factory_id: 'f1' },
      ),
    ).toBe(true)

    expect(
      canStartExecution(
        { status: 'approved', factory_id: 'f1' },
        { id: 'u2', role: 'project_manager', factory_id: 'f1' },
      ),
    ).toBe(false)

    expect(
      canStartExecution(
        { status: 'approved', factory_id: 'f1' },
        { id: 'u3', role: 'company_director', factory_id: null },
      ),
    ).toBe(false)
  })

  it('computes remaining phase budget', () => {
    expect(
      remainingPhaseBudget(1000, [
        { expected_budget: 400 },
        { expected_budget: 250 },
      ]),
    ).toBe(350)
    expect(isPhaseBudgetSumValid(1000, [{ expected_budget: 1000 }])).toBe(true)
  })
})
