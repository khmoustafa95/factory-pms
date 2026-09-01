import type {
  Phase,
  Project,
  ProjectExpenseLine,
  ProjectFinancialSnapshot,
  ProjectFundingEntry,
  Task,
} from '@/types/database'

export function sumFundingPlanned(entries: ProjectFundingEntry[]): number {
  return entries
    .filter((entry) => entry.status !== 'cancelled')
    .reduce((sum, entry) => sum + Number(entry.amount), 0)
}

export function sumFundingReceived(entries: ProjectFundingEntry[]): number {
  return entries
    .filter((entry) => entry.status === 'received')
    .reduce((sum, entry) => sum + Number(entry.amount), 0)
}

export function sumExpensePlanWbs(phases: Phase[]): number {
  return phases.reduce(
    (sum, phase) => sum + Number(phase.expected_budget ?? 0),
    0,
  )
}

export function sumSpentWbs(tasks: Array<Pick<Task, 'actual_cost'>>): number {
  return tasks.reduce((sum, task) => sum + Number(task.actual_cost ?? 0), 0)
}

export function sumExpensePlanOverhead(lines: ProjectExpenseLine[]): number {
  return lines.reduce((sum, line) => sum + Number(line.planned_amount), 0)
}

export function sumSpentOverhead(lines: ProjectExpenseLine[]): number {
  return lines.reduce(
    (sum, line) => sum + Number(line.actual_amount ?? line.planned_amount),
    0,
  )
}

export function buildFinancialSnapshot(
  project: Pick<Project, 'budget'>,
  fundingEntries: ProjectFundingEntry[],
  expenseLines: ProjectExpenseLine[],
  phases: Phase[],
  tasks: Array<Pick<Task, 'actual_cost'>>,
): ProjectFinancialSnapshot {
  const approvedBudget = project.budget
  const fundingPlanned = sumFundingPlanned(fundingEntries)
  const fundingReceived = sumFundingReceived(fundingEntries)
  const expensePlanWbs = sumExpensePlanWbs(phases)
  const expensePlanOverhead = sumExpensePlanOverhead(expenseLines)
  const expensePlanTotal = expensePlanWbs + expensePlanOverhead
  const spentWbs = sumSpentWbs(tasks)
  const spentOverhead = sumSpentOverhead(expenseLines)
  const spentTotal = spentWbs + spentOverhead

  return {
    approved_budget: approvedBudget,
    funding_planned: fundingPlanned,
    funding_received: fundingReceived,
    expense_plan_wbs: expensePlanWbs,
    expense_plan_overhead: expensePlanOverhead,
    expense_plan_total: expensePlanTotal,
    spent_wbs: spentWbs,
    spent_overhead: spentOverhead,
    spent_total: spentTotal,
    funding_gap:
      approvedBudget == null ? null : approvedBudget - fundingReceived,
    budget_remaining:
      approvedBudget == null ? null : approvedBudget - spentTotal,
  }
}

export function fundingReceivedPercent(
  snapshot: Pick<
    ProjectFinancialSnapshot,
    'approved_budget' | 'funding_received'
  >,
): number | null {
  if (
    snapshot.approved_budget == null ||
    snapshot.approved_budget <= 0
  ) {
    return null
  }

  return Math.min(
    100,
    (snapshot.funding_received / snapshot.approved_budget) * 100,
  )
}

export function budgetUsedPercent(
  snapshot: Pick<ProjectFinancialSnapshot, 'approved_budget' | 'spent_total'>,
): number | null {
  if (
    snapshot.approved_budget == null ||
    snapshot.approved_budget <= 0
  ) {
    return null
  }

  return Math.min(
    100,
    (snapshot.spent_total / snapshot.approved_budget) * 100,
  )
}
