import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useTranslation } from '@/contexts/LocaleContext'
import {
  budgetUsedPercent,
  fundingReceivedPercent,
} from '@/lib/project-financial-snapshot'
import { formatLocalizedBudget } from '@/lib/i18n-format'
import type { ProjectFinancialSnapshot } from '@/types/database'

interface FinancialSnapshotCardProps {
  snapshot: ProjectFinancialSnapshot
  currency: string
}

function SnapshotRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

export function FinancialSnapshotCard({
  snapshot,
  currency,
}: FinancialSnapshotCardProps) {
  const { t, locale } = useTranslation()
  const notAvailable = t('common.notAvailable')
  const formatAmount = (value: number | null) =>
    formatLocalizedBudget(value, currency, locale, notAvailable)

  const fundingPct = fundingReceivedPercent(snapshot)
  const usedPct = budgetUsedPercent(snapshot)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('projectFinance.snapshot.title')}</CardTitle>
        <CardDescription>{t('projectFinance.snapshot.description')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <SnapshotRow
          label={t('projectFinance.snapshot.approvedBudget')}
          value={formatAmount(snapshot.approved_budget)}
        />
        <SnapshotRow
          label={t('projectFinance.snapshot.fundingPlanned')}
          value={formatAmount(snapshot.funding_planned)}
        />
        <SnapshotRow
          label={t('projectFinance.snapshot.fundingReceived')}
          value={
            fundingPct == null
              ? formatAmount(snapshot.funding_received)
              : `${formatAmount(snapshot.funding_received)} (${fundingPct.toFixed(0)}%)`
          }
        />
        <SnapshotRow
          label={t('projectFinance.snapshot.fundingGap')}
          value={formatAmount(snapshot.funding_gap)}
        />
        <SnapshotRow
          label={t('projectFinance.snapshot.expensePlanTotal')}
          value={formatAmount(snapshot.expense_plan_total)}
        />
        <SnapshotRow
          label={t('projectFinance.snapshot.expensePlanWbs')}
          value={formatAmount(snapshot.expense_plan_wbs)}
        />
        <SnapshotRow
          label={t('projectFinance.snapshot.expensePlanOverhead')}
          value={formatAmount(snapshot.expense_plan_overhead)}
        />
        <SnapshotRow
          label={t('projectFinance.snapshot.spentTotal')}
          value={
            usedPct == null
              ? formatAmount(snapshot.spent_total)
              : `${formatAmount(snapshot.spent_total)} (${usedPct.toFixed(0)}%)`
          }
        />
        <SnapshotRow
          label={t('projectFinance.snapshot.budgetRemaining')}
          value={formatAmount(snapshot.budget_remaining)}
        />
      </CardContent>
    </Card>
  )
}
