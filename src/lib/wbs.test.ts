import { describe, expect, it } from 'vitest'
import {
  canStartExecution,
  canManagePhases,
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
    assigned_pm_id: 'pm1',
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

  it('is not ready without an assigned project manager', () => {
    const notReady = getExecutionReadiness(
      { ...baseProject, assigned_pm_id: null },
      [
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
      ],
    )
    expect(notReady.ready).toBe(false)
    expect(notReady.reasons).toContain('missing_assigned_pm')
  })

  it('is not ready without calendar start and end dates', () => {
    const notReady = getExecutionReadiness(
      {
        ...baseProject,
        proposed_start_date: null,
        proposed_end_date: null,
        proposed_duration_value: 3,
        proposed_duration_unit: 'month',
      },
      [
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
      ],
    )
    expect(notReady.ready).toBe(false)
    expect(notReady.reasons).toContain('missing_project_schedule')
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

  it('lets only the factory manager of the same factory write phases', () => {
    const project = {
      status: 'approved' as const,
      assigned_pm_id: 'pm1',
      factory_id: 'f1',
    }
    expect(
      canManagePhases(project, {
        id: 'fm1',
        role: 'factory_manager',
        factory_id: 'f1',
      }),
    ).toBe(true)
    expect(
      canManagePhases(project, {
        id: 'pm1',
        role: 'project_manager',
        factory_id: 'f1',
      }),
    ).toBe(false)
    expect(
      canManagePhases(project, {
        id: 'd1',
        role: 'company_director',
        factory_id: null,
      }),
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
