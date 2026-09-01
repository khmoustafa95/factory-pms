import { describe, expect, it } from 'vitest'
import {
  buildFinancialSnapshot,
  budgetUsedPercent,
  fundingReceivedPercent,
} from '@/lib/project-financial-snapshot'

describe('buildFinancialSnapshot', () => {
  it('aggregates funding, WBS, and overhead', () => {
    const snapshot = buildFinancialSnapshot(
      { budget: 100_000 },
      [
        {
          amount: 40_000,
          status: 'received',
        } as never,
        {
          amount: 20_000,
          status: 'planned',
        } as never,
      ],
      [
        {
          planned_amount: 5_000,
          actual_amount: 3_000,
        } as never,
      ],
      [{ expected_budget: 60_000 } as never],
      [{ actual_cost: 25_000 } as never],
    )

    expect(snapshot.funding_planned).toBe(60_000)
    expect(snapshot.funding_received).toBe(40_000)
    expect(snapshot.expense_plan_wbs).toBe(60_000)
    expect(snapshot.expense_plan_overhead).toBe(5_000)
    expect(snapshot.spent_wbs).toBe(25_000)
    expect(snapshot.spent_overhead).toBe(3_000)
    expect(snapshot.funding_gap).toBe(60_000)
    expect(snapshot.budget_remaining).toBe(72_000)
  })
})

describe('fundingReceivedPercent', () => {
  it('returns null when budget missing', () => {
    expect(
      fundingReceivedPercent({
        approved_budget: null,
        funding_received: 1_000,
      }),
    ).toBeNull()
  })

  it('caps at 100%', () => {
    expect(
      fundingReceivedPercent({
        approved_budget: 10_000,
        funding_received: 12_000,
      }),
    ).toBe(100)
  })
})

describe('budgetUsedPercent', () => {
  it('computes utilization', () => {
    expect(
      budgetUsedPercent({
        approved_budget: 50_000,
        spent_total: 10_000,
      }),
    ).toBe(20)
  })
})
