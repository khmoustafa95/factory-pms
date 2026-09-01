import type { ReactNode } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ExpenseLineFormDialog } from '@/components/expense-lines/ExpenseLineFormDialog'
import { FinancialSnapshotCard } from '@/components/finance/FinancialSnapshotCard'
import { FundingFormDialog } from '@/components/funding/FundingFormDialog'
import { ProcurementFormDialog } from '@/components/procurement/ProcurementFormDialog'
import { QueryState } from '@/components/QueryState'
import { StaffFormDialog } from '@/components/staff/StaffFormDialog'
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
import { useEditDialog } from '@/hooks/useEditDialog'
import {
  useCreateProjectExpenseLine,
  useDeleteProjectExpenseLine,
  useProjectExpenseLines,
  useUpdateProjectExpenseLine,
} from '@/hooks/useProjectExpenseLines'
import {
  useCreateProjectFunding,
  useDeleteProjectFunding,
  useProjectFunding,
  useUpdateProjectFunding,
} from '@/hooks/useProjectFunding'
import { useProjectFinancialSnapshot } from '@/hooks/useProjectFinancialSnapshot'
import {
  useCreateProjectProcurement,
  useDeleteProjectProcurement,
  useProjectProcurement,
  useUpdateProjectProcurement,
} from '@/hooks/useProjectProcurement'
import {
  sumStaffHeadcount,
  useCreateProjectStaff,
  useDeleteProjectStaff,
  useProjectStaff,
  useUpdateProjectStaff,
} from '@/hooks/useProjectStaff'
import { formatLocalizedBudget, formatLocalizedDate } from '@/lib/i18n-format'
import { countOpenProcurement } from '@/lib/project-finance'
import { toastMutationError } from '@/lib/mutation-error'
import type { FundingFormValues } from '@/lib/validations/funding'
import type { ExpenseLineFormValues } from '@/lib/validations/expense-line'
import type { ProcurementFormValues } from '@/lib/validations/procurement'
import type { StaffFormValues } from '@/lib/validations/staff'
import type {
  Phase,
  ProjectExpenseLine,
  ProjectFundingEntry,
  ProjectProcurementItem,
  ProjectStaff,
} from '@/types/database'

interface ProjectFinancePanelProps {
  projectId: string
  currency: string
  canManage: boolean
  phases?: Phase[]
  enabled?: boolean
}

export function ProjectFinancePanel({
  projectId,
  currency,
  canManage,
  phases = [],
  enabled = true,
}: ProjectFinancePanelProps) {
  const { t, locale } = useTranslation()
  const notAvailable = t('common.notAvailable')
  const formatAmount = (value: number | null | undefined) =>
    formatLocalizedBudget(value ?? null, currency, locale, notAvailable)
  const formatDate = (value: string | null | undefined) =>
    value ? formatLocalizedDate(value, locale) : notAvailable

  const fundingDialog = useEditDialog<ProjectFundingEntry>()
  const procurementDialog = useEditDialog<ProjectProcurementItem>()
  const staffDialog = useEditDialog<ProjectStaff>()
  const expenseDialog = useEditDialog<ProjectExpenseLine>()

  const {
    data: snapshot,
    isLoading: snapshotLoading,
    error: snapshotError,
    refetch: refetchSnapshot,
    isFetching: snapshotFetching,
  } = useProjectFinancialSnapshot(projectId, enabled)

  const { data: funding = [], isLoading: fundingLoading } = useProjectFunding(
    projectId,
    enabled,
  )
  const { data: procurement = [], isLoading: procurementLoading } =
    useProjectProcurement(projectId, enabled)
  const { data: staff = [], isLoading: staffLoading } = useProjectStaff(
    projectId,
    enabled,
  )
  const { data: expenseLines = [], isLoading: expenseLoading } =
    useProjectExpenseLines(projectId, enabled)

  const createFunding = useCreateProjectFunding(projectId)
  const updateFunding = useUpdateProjectFunding(projectId)
  const deleteFunding = useDeleteProjectFunding(projectId)
  const createProcurement = useCreateProjectProcurement(projectId)
  const updateProcurement = useUpdateProjectProcurement(projectId)
  const deleteProcurement = useDeleteProjectProcurement(projectId)
  const createStaff = useCreateProjectStaff(projectId)
  const updateStaff = useUpdateProjectStaff(projectId)
  const deleteStaff = useDeleteProjectStaff(projectId)
  const createExpense = useCreateProjectExpenseLine(projectId)
  const updateExpense = useUpdateProjectExpenseLine(projectId)
  const deleteExpense = useDeleteProjectExpenseLine(projectId)

  const handleFundingSubmit = async (values: FundingFormValues) => {
    try {
      if (fundingDialog.editingItem) {
        await updateFunding.mutateAsync({
          id: fundingDialog.editingItem.id,
          values,
        })
        toast.success(t('projectFinance.funding.updated'))
      } else {
        await createFunding.mutateAsync(values)
        toast.success(t('projectFinance.funding.added'))
      }
    } catch (error) {
      toastMutationError(error, t('projectFinance.funding.saveFailed'))
      throw error
    }
  }

  const handleProcurementSubmit = async (values: ProcurementFormValues) => {
    try {
      if (procurementDialog.editingItem) {
        await updateProcurement.mutateAsync({
          id: procurementDialog.editingItem.id,
          values,
        })
        toast.success(t('projectFinance.procurement.updated'))
      } else {
        await createProcurement.mutateAsync(values)
        toast.success(t('projectFinance.procurement.added'))
      }
    } catch (error) {
      toastMutationError(error, t('projectFinance.procurement.saveFailed'))
      throw error
    }
  }

  const handleStaffSubmit = async (values: StaffFormValues) => {
    try {
      if (staffDialog.editingItem) {
        await updateStaff.mutateAsync({
          id: staffDialog.editingItem.id,
          values,
        })
        toast.success(t('projectFinance.staff.updated'))
      } else {
        await createStaff.mutateAsync(values)
        toast.success(t('projectFinance.staff.added'))
      }
    } catch (error) {
      toastMutationError(error, t('projectFinance.staff.saveFailed'))
      throw error
    }
  }

  const handleExpenseSubmit = async (values: ExpenseLineFormValues) => {
    try {
      if (expenseDialog.editingItem) {
        await updateExpense.mutateAsync({
          id: expenseDialog.editingItem.id,
          values,
        })
        toast.success(t('projectFinance.expensePlan.updated'))
      } else {
        await createExpense.mutateAsync(values)
        toast.success(t('projectFinance.expensePlan.added'))
      }
    } catch (error) {
      toastMutationError(error, t('projectFinance.expensePlan.saveFailed'))
      throw error
    }
  }

  const isLoading =
    snapshotLoading ||
    fundingLoading ||
    procurementLoading ||
    staffLoading ||
    expenseLoading

  return (
    <div className="space-y-6">
      <QueryState
        isLoading={isLoading}
        error={snapshotError}
        loadingMessage={t('projectFinance.loading')}
        errorMessage={t('projectFinance.loadFailed')}
        onRetry={() => void refetchSnapshot()}
        isRetrying={snapshotFetching}
      >
        {snapshot ? (
          <FinancialSnapshotCard snapshot={snapshot} currency={currency} />
        ) : null}
      </QueryState>

      <FinanceSection
        title={t('projectFinance.funding.title')}
        description={t('projectFinance.funding.description')}
        canManage={canManage}
        onAdd={() => fundingDialog.openCreate()}
        emptyMessage={t('projectFinance.funding.empty')}
        isEmpty={funding.length === 0}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('projectFinance.funding.sourceType')}</TableHead>
              <TableHead>{t('projectFinance.funding.amount')}</TableHead>
              <TableHead>{t('projectFinance.funding.expectedDate')}</TableHead>
              <TableHead>{t('projectFinance.funding.receivedDate')}</TableHead>
              <TableHead>{t('common.status')}</TableHead>
              {canManage ? <TableHead>{t('common.actions')}</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {funding.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  {entry.source_type === 'other' && entry.source_name
                    ? entry.source_name
                    : t(`projectFinance.funding.sourceTypes.${entry.source_type}`)}
                </TableCell>
                <TableCell>{formatAmount(entry.amount)}</TableCell>
                <TableCell>{formatDate(entry.expected_date)}</TableCell>
                <TableCell>{formatDate(entry.received_date)}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {t(`projectFinance.funding.statuses.${entry.status}`)}
                  </Badge>
                </TableCell>
                {canManage ? (
                  <TableCell>
                    <RowActions
                      onEdit={() => fundingDialog.openEdit(entry)}
                      onDelete={async () => {
                        try {
                          await deleteFunding.mutateAsync(entry.id)
                          toast.success(t('projectFinance.funding.deleted'))
                        } catch (error) {
                          toastMutationError(
                            error,
                            t('projectFinance.funding.deleteFailed'),
                          )
                        }
                      }}
                      editLabel={t('common.edit')}
                      deleteLabel={t('common.delete')}
                    />
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </FinanceSection>

      <FinanceSection
        title={t('projectFinance.expensePlan.title')}
        description={t('projectFinance.expensePlan.description')}
        canManage={canManage}
        onAdd={() => expenseDialog.openCreate()}
        emptyMessage={t('projectFinance.expensePlan.empty')}
        isEmpty={expenseLines.length === 0}
        extra={
          snapshot ? (
            <p className="text-sm text-muted-foreground">
              {t('projectFinance.expensePlan.wbsRollup', {
                amount: formatAmount(snapshot.expense_plan_wbs),
              })}
            </p>
          ) : null
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('projectFinance.expensePlan.category')}</TableHead>
              <TableHead>{t('common.description')}</TableHead>
              <TableHead>{t('projectFinance.expensePlan.plannedAmount')}</TableHead>
              <TableHead>{t('projectFinance.expensePlan.actualAmount')}</TableHead>
              {canManage ? <TableHead>{t('common.actions')}</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenseLines.map((line) => (
              <TableRow key={line.id}>
                <TableCell>
                  {t(`projectFinance.expensePlan.categories.${line.category}`)}
                </TableCell>
                <TableCell>{line.description}</TableCell>
                <TableCell>{formatAmount(line.planned_amount)}</TableCell>
                <TableCell>{formatAmount(line.actual_amount)}</TableCell>
                {canManage ? (
                  <TableCell>
                    <RowActions
                      onEdit={() => expenseDialog.openEdit(line)}
                      onDelete={async () => {
                        try {
                          await deleteExpense.mutateAsync(line.id)
                          toast.success(t('projectFinance.expensePlan.deleted'))
                        } catch (error) {
                          toastMutationError(
                            error,
                            t('projectFinance.expensePlan.deleteFailed'),
                          )
                        }
                      }}
                      editLabel={t('common.edit')}
                      deleteLabel={t('common.delete')}
                    />
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </FinanceSection>

      <FinanceSection
        title={t('projectFinance.procurement.title')}
        description={t('projectFinance.procurement.description')}
        canManage={canManage}
        onAdd={() => procurementDialog.openCreate()}
        emptyMessage={t('projectFinance.procurement.empty')}
        isEmpty={procurement.length === 0}
        extra={
          <p className="text-sm text-muted-foreground">
            {t('projectFinance.procurement.openCount', {
              count: countOpenProcurement(procurement),
            })}
          </p>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('common.description')}</TableHead>
              <TableHead>{t('projectFinance.procurement.quantity')}</TableHead>
              <TableHead>{t('projectFinance.procurement.estimatedCost')}</TableHead>
              <TableHead>{t('projectFinance.procurement.neededBy')}</TableHead>
              <TableHead>{t('common.status')}</TableHead>
              {canManage ? <TableHead>{t('common.actions')}</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {procurement.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.description}</TableCell>
                <TableCell>
                  {item.quantity} {item.unit}
                </TableCell>
                <TableCell>{formatAmount(item.estimated_cost)}</TableCell>
                <TableCell>{formatDate(item.needed_by_date)}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {t(`projectFinance.procurement.statuses.${item.status}`)}
                  </Badge>
                </TableCell>
                {canManage ? (
                  <TableCell>
                    <RowActions
                      onEdit={() => procurementDialog.openEdit(item)}
                      onDelete={async () => {
                        try {
                          await deleteProcurement.mutateAsync(item.id)
                          toast.success(t('projectFinance.procurement.deleted'))
                        } catch (error) {
                          toastMutationError(
                            error,
                            t('projectFinance.procurement.deleteFailed'),
                          )
                        }
                      }}
                      editLabel={t('common.edit')}
                      deleteLabel={t('common.delete')}
                    />
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </FinanceSection>

      <FinanceSection
        title={t('projectFinance.staff.title')}
        description={t('projectFinance.staff.description')}
        canManage={canManage}
        onAdd={() => staffDialog.openCreate()}
        emptyMessage={t('projectFinance.staff.empty')}
        isEmpty={staff.length === 0}
        extra={
          <p className="text-sm text-muted-foreground">
            {t('projectFinance.staff.totalHeadcount', {
              count: sumStaffHeadcount(staff),
            })}
          </p>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('common.name')}</TableHead>
              <TableHead>{t('projectFinance.staff.roleTitle')}</TableHead>
              <TableHead>{t('projectFinance.staff.headcount')}</TableHead>
              <TableHead>{t('projectFinance.staff.qualifications')}</TableHead>
              {canManage ? <TableHead>{t('common.actions')}</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((member) => (
              <TableRow key={member.id}>
                <TableCell>{member.full_name}</TableCell>
                <TableCell>
                  {member.role_title}
                  {member.is_contractor ? (
                    <Badge variant="secondary" className="ms-2">
                      {t('projectFinance.staff.contractorBadge')}
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell>{member.headcount}</TableCell>
                <TableCell className="max-w-xs truncate">
                  {member.qualifications ?? notAvailable}
                </TableCell>
                {canManage ? (
                  <TableCell>
                    <RowActions
                      onEdit={() => staffDialog.openEdit(member)}
                      onDelete={async () => {
                        try {
                          await deleteStaff.mutateAsync(member.id)
                          toast.success(t('projectFinance.staff.deleted'))
                        } catch (error) {
                          toastMutationError(
                            error,
                            t('projectFinance.staff.deleteFailed'),
                          )
                        }
                      }}
                      editLabel={t('common.edit')}
                      deleteLabel={t('common.delete')}
                    />
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </FinanceSection>

      <FundingFormDialog
        open={fundingDialog.open}
        onOpenChange={fundingDialog.setOpen}
        entry={fundingDialog.editingItem}
        onSubmit={handleFundingSubmit}
        isSubmitting={createFunding.isPending || updateFunding.isPending}
      />
      <ProcurementFormDialog
        open={procurementDialog.open}
        onOpenChange={procurementDialog.setOpen}
        item={procurementDialog.editingItem}
        phases={phases}
        onSubmit={handleProcurementSubmit}
        isSubmitting={createProcurement.isPending || updateProcurement.isPending}
      />
      <StaffFormDialog
        open={staffDialog.open}
        onOpenChange={staffDialog.setOpen}
        member={staffDialog.editingItem}
        phases={phases}
        onSubmit={handleStaffSubmit}
        isSubmitting={createStaff.isPending || updateStaff.isPending}
      />
      <ExpenseLineFormDialog
        open={expenseDialog.open}
        onOpenChange={expenseDialog.setOpen}
        line={expenseDialog.editingItem}
        phases={phases}
        onSubmit={handleExpenseSubmit}
        isSubmitting={createExpense.isPending || updateExpense.isPending}
      />
    </div>
  )
}

function FinanceSection({
  title,
  description,
  canManage,
  onAdd,
  emptyMessage,
  isEmpty,
  extra,
  children,
}: {
  title: string
  description: string
  canManage: boolean
  onAdd: () => void
  emptyMessage: string
  isEmpty: boolean
  extra?: ReactNode
  children: ReactNode
}) {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
          {extra}
        </div>
        {canManage ? (
          <Button type="button" size="sm" variant="outline" onClick={onAdd}>
            <Plus className="size-4" />
            {t('common.add')}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

function RowActions({
  onEdit,
  onDelete,
  editLabel,
  deleteLabel,
}: {
  onEdit: () => void
  onDelete: () => Promise<void>
  editLabel: string
  deleteLabel: string
}) {
  return (
    <div className="flex gap-1">
      <Button type="button" size="icon" variant="ghost" onClick={onEdit}>
        <Pencil className="size-4" />
        <span className="sr-only">{editLabel}</span>
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => void onDelete()}
      >
        <Trash2 className="size-4" />
        <span className="sr-only">{deleteLabel}</span>
      </Button>
    </div>
  )
}
