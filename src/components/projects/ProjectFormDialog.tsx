import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useWatch } from 'react-hook-form'
import { AccountFormDialog } from '@/components/accounts/AccountFormDialog'
import { FormFieldError } from '@/components/FormFieldError'
import { ProposalFilePicker } from '@/components/projects/ProposalFilePicker'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useTranslation } from '@/contexts/LocaleContext'
import { useCreateAccount } from '@/hooks/useAccounts'
import { useFormDialog } from '@/hooks/useFormDialog'
import { useActiveCurrencies } from '@/hooks/useCurrencies'
import { useFactoryProjectManagers } from '@/hooks/useProjects'
import { getPhaseDurationDays } from '@/lib/duration'
import {
  formatNullableSelectValue,
  NULL_SELECT_VALUE,
  parseNullableSelectValue,
} from '@/lib/form-utils'
import { toastMutationError } from '@/lib/mutation-error'
import {
  createDraftProjectSchema,
  createSubmitProjectSchema,
  type ProjectFormValues,
} from '@/lib/validations/project'
import type { AccountDialogFormValues } from '@/lib/validations/account'
import type { Project } from '@/types/database'
import { toast } from 'sonner'

export interface ProjectFormSubmitPayload {
  values: ProjectFormValues
  files: File[]
}

interface ProjectFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: Project | null
  factoryId: string | null | undefined
  /** When false, only a Save action is shown (no draft/submit proposal). */
  allowSubmitProposal?: boolean
  onSaveDraft: (payload: ProjectFormSubmitPayload) => Promise<void>
  onSubmitProposal: (payload: ProjectFormSubmitPayload) => Promise<void>
  isSubmitting: boolean
}

const ADD_PM_VALUE = '__add_project_manager__'

const PROJECT_FORM_DEFAULTS: ProjectFormValues = {
  code: '',
  title: '',
  description: '',
  budget: '',
  currency: 'USD',
  proposed_start_date: '',
  proposed_end_date: '',
  assigned_pm_id: null,
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  factoryId,
  allowSubmitProposal = true,
  onSaveDraft,
  onSubmitProposal,
  isSubmitting,
}: ProjectFormDialogProps) {
  const { t, locale } = useTranslation()
  const { data: currencies = [] } = useActiveCurrencies()
  const { data: projectManagers = [], refetch: refetchManagers } =
    useFactoryProjectManagers(factoryId)
  const createAccount = useCreateAccount()
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [addPmOpen, setAddPmOpen] = useState(false)

  const draftSchema = useMemo(() => createDraftProjectSchema(t), [t])
  const submitSchema = useMemo(() => createSubmitProjectSchema(t), [t])

  const { form } = useFormDialog({
    open,
    resolver: zodResolver(draftSchema),
    defaultValues: PROJECT_FORM_DEFAULTS,
    getValues: () => ({
      code: project?.code ?? '',
      title: project?.title ?? '',
      description: project?.description ?? '',
      budget: project?.budget != null ? String(project.budget) : '',
      currency: project?.currency ?? 'USD',
      proposed_start_date: project?.proposed_start_date ?? '',
      proposed_end_date: project?.proposed_end_date ?? '',
      assigned_pm_id: project?.assigned_pm_id ?? null,
    }),
    resetDependencies: [project],
  })

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setPendingFiles([])
    }
    onOpenChange(nextOpen)
  }

  const selectedCurrency = useWatch({
    control: form.control,
    name: 'currency',
  })
  const selectedPmId = useWatch({
    control: form.control,
    name: 'assigned_pm_id',
  })
  const startDate = useWatch({
    control: form.control,
    name: 'proposed_start_date',
  })
  const endDate = useWatch({
    control: form.control,
    name: 'proposed_end_date',
  })

  const derivedDurationDays =
    startDate && endDate && endDate >= startDate
      ? getPhaseDurationDays(startDate, endDate)
      : null

  const closeDialog = () => {
    setPendingFiles([])
    onOpenChange(false)
  }

  const applySchemaErrors = (
    issues: Array<{ path: PropertyKey[]; message: string }>,
  ) => {
    for (const issue of issues) {
      const field = String(issue.path[0] ?? '')
      if (
        field === 'code' ||
        field === 'title' ||
        field === 'description' ||
        field === 'budget' ||
        field === 'currency' ||
        field === 'proposed_start_date' ||
        field === 'proposed_end_date' ||
        field === 'assigned_pm_id'
      ) {
        form.setError(field, { message: issue.message })
      }
    }
  }

  const saveDraft = async () => {
    form.clearErrors()
    const values = form.getValues()
    const parsed = draftSchema.safeParse(values)
    if (!parsed.success) {
      applySchemaErrors(parsed.error.issues)
      return
    }

    try {
      await onSaveDraft({
        values: {
          ...values,
          code: values.code ?? '',
          title: values.title ?? '',
          description: values.description ?? '',
          budget: values.budget ?? '',
          currency: values.currency || 'USD',
          proposed_start_date: values.proposed_start_date ?? '',
          proposed_end_date: values.proposed_end_date ?? '',
          assigned_pm_id: values.assigned_pm_id ?? null,
        },
        files: pendingFiles,
      })
      closeDialog()
    } catch {
      // Caller handles toast
    }
  }

  const submitProposal = async () => {
    form.clearErrors()
    const values = form.getValues()
    const parsed = submitSchema.safeParse({
      ...values,
      code: (values.code ?? '').toUpperCase(),
    })
    if (!parsed.success) {
      applySchemaErrors(parsed.error.issues)
      return
    }

    try {
      await onSubmitProposal({
        values: {
          code: parsed.data.code,
          title: parsed.data.title,
          description: parsed.data.description,
          budget: parsed.data.budget,
          currency: parsed.data.currency,
          proposed_start_date: parsed.data.proposed_start_date,
          proposed_end_date: parsed.data.proposed_end_date,
          assigned_pm_id: parsed.data.assigned_pm_id,
        },
        files: pendingFiles,
      })
      closeDialog()
    } catch {
      // Caller handles toast
    }
  }

  const handleCreatePm = async (accountValues: AccountDialogFormValues) => {
    try {
      const result = await createAccount.mutateAsync({
        ...accountValues,
        role: 'project_manager',
        factory_id: factoryId ?? accountValues.factory_id,
      })
      await refetchManagers()
      form.setValue('assigned_pm_id', result.user_id, { shouldDirty: true })
      toast.success(
        t('projects.pmCreatedWithPassword', { password: result.password }),
      )
      setAddPmOpen(false)
    } catch (error) {
      toastMutationError(error, t('accounts.createFailed'))
      throw error
    }
  }

  const isDetailsEdit = Boolean(project) && !allowSubmitProposal

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isDetailsEdit
                ? t('projects.editProject')
                : project
                  ? t('projects.editProposal')
                  : t('projects.newProposal')}
            </DialogTitle>
            <DialogDescription>
              {isDetailsEdit
                ? t('projects.editDetailsDescription')
                : t('projects.formDescription')}
            </DialogDescription>
          </DialogHeader>

          <form key={locale} className="flex min-h-0 flex-1 flex-col">
            <DialogBody className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-code">{t('projects.code')}</Label>
                <Input
                  id="project-code"
                  className="uppercase"
                  {...form.register('code')}
                />
                <FormFieldError error={form.formState.errors.code} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-title">{t('common.title')}</Label>
                <Input id="project-title" {...form.register('title')} />
                <FormFieldError error={form.formState.errors.title} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-description">
                  {t('common.description')}
                </Label>
                <Textarea
                  id="project-description"
                  rows={4}
                  {...form.register('description')}
                />
                <FormFieldError error={form.formState.errors.description} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="project-budget">{t('common.budget')}</Label>
                  <Input
                    id="project-budget"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    {...form.register('budget')}
                  />
                  <FormFieldError error={form.formState.errors.budget} />
                </div>

                <div className="space-y-2">
                  <Label>{t('projects.currency')}</Label>
                  <Select
                    value={selectedCurrency}
                    onValueChange={(value) =>
                      form.setValue('currency', value, { shouldDirty: true })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c.id} value={c.code}>
                          {c.code}
                          {c.symbol ? ` (${c.symbol})` : ''}
                        </SelectItem>
                      ))}
                      {currencies.length === 0 ? (
                        <SelectItem value="USD">USD ($)</SelectItem>
                      ) : null}
                    </SelectContent>
                  </Select>
                  <FormFieldError error={form.formState.errors.currency} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="project-start">
                    {t('projects.proposedStartDate')}
                  </Label>
                  <Input
                    id="project-start"
                    type="date"
                    {...form.register('proposed_start_date')}
                  />
                  <FormFieldError
                    error={form.formState.errors.proposed_start_date}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project-end">
                    {t('projects.proposedEndDate')}
                  </Label>
                  <Input
                    id="project-end"
                    type="date"
                    {...form.register('proposed_end_date')}
                  />
                  <FormFieldError
                    error={form.formState.errors.proposed_end_date}
                  />
                </div>
              </div>

              {derivedDurationDays != null ? (
                <p className="text-xs text-muted-foreground">
                  {t('projects.derivedDuration', { days: derivedDurationDays })}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t('projects.datesHint')}
                </p>
              )}

              <div className="space-y-2">
                <Label>{t('projects.assignedPm')}</Label>
                <Select
                  value={formatNullableSelectValue(selectedPmId)}
                  onValueChange={(value) => {
                    if (value === ADD_PM_VALUE) {
                      setAddPmOpen(true)
                      return
                    }
                    form.setValue(
                      'assigned_pm_id',
                      parseNullableSelectValue(value),
                    )
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.optional')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NULL_SELECT_VALUE}>
                      {t('common.unassigned')}
                    </SelectItem>
                    {projectManagers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.full_name}
                      </SelectItem>
                    ))}
                    {factoryId ? (
                      <SelectItem value={ADD_PM_VALUE}>
                        {t('projects.addProjectManager')}
                      </SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
                <FormFieldError error={form.formState.errors.assigned_pm_id} />
                {allowSubmitProposal ? (
                  <p className="text-xs text-muted-foreground">
                    {t('projects.pmRequiredToSubmit')}
                  </p>
                ) : null}
              </div>

              {allowSubmitProposal ? (
                <ProposalFilePicker
                  files={pendingFiles}
                  onChange={setPendingFiles}
                  disabled={isSubmitting}
                />
              ) : null}
            </DialogBody>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t('common.cancel')}
              </Button>
              {allowSubmitProposal ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isSubmitting}
                    onClick={() => void saveDraft()}
                  >
                    {isSubmitting ? t('common.saving') : t('common.saveDraft')}
                  </Button>
                  <Button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void submitProposal()}
                  >
                    {isSubmitting
                      ? t('common.submitting')
                      : t('common.submitProposal')}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void saveDraft()}
                >
                  {isSubmitting ? t('common.saving') : t('common.save')}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AccountFormDialog
        open={addPmOpen}
        onOpenChange={setAddPmOpen}
        account={null}
        allowedRoles={['project_manager']}
        lockFactoryId={factoryId}
        onCreate={handleCreatePm}
        onUpdate={async () => undefined}
        isSubmitting={createAccount.isPending}
      />
    </>
  )
}
