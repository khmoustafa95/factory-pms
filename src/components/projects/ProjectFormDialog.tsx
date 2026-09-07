import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useWatch, type Resolver } from 'react-hook-form'
import { DatePickerField } from '@/components/DatePicker'
import { DiscardChangesDialog } from '@/components/DiscardChangesDialog'
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
import { useFormDialog } from '@/hooks/useFormDialog'
import { useFormDialogClose } from '@/hooks/useFormDialogClose'
import { useValidationSchema } from '@/hooks/useValidationSchema'
import { useActiveCurrencies } from '@/hooks/useCurrencies'
import { getPhaseDurationDays } from '@/lib/duration'
import {
  formatNullableSelectValue,
  NULL_SELECT_VALUE,
  parseNullableSelectValue,
} from '@/lib/form-utils'
import { matchMutationErrorKey } from '@/lib/mutation-error'
import {
  createDraftProjectSchema,
  createSubmitProjectSchema,
  PROJECT_PRIORITIES,
  type ProjectFormValues,
} from '@/lib/validations/project'
import type { Project } from '@/types/database'

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

const PROJECT_FORM_DEFAULTS: ProjectFormValues = {
  code: '',
  title: '',
  description: '',
  budget: '',
  currency: 'USD',
  proposed_start_date: '',
  proposed_end_date: '',
  announcement_date: '',
  announcing_entity: '',
  priority: '',
  research_opinion: '',
  board_opinion: '',
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  allowSubmitProposal = true,
  onSaveDraft,
  onSubmitProposal,
  isSubmitting,
}: ProjectFormDialogProps) {
  const { t } = useTranslation()
  const { data: currencies = [] } = useActiveCurrencies()
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  const draftSchema = useValidationSchema(createDraftProjectSchema)
  const submitSchema = useValidationSchema(createSubmitProjectSchema)

  const { form, isDirty } = useFormDialog<ProjectFormValues>({
    open,
    resolver: zodResolver(draftSchema) as Resolver<ProjectFormValues>,
    defaultValues: PROJECT_FORM_DEFAULTS,
    getValues: () => ({
      code: project?.code ?? '',
      title: project?.title ?? '',
      description: project?.description ?? '',
      budget: project?.budget != null ? String(project.budget) : '',
      currency: project?.currency ?? 'USD',
      proposed_start_date: project?.proposed_start_date ?? '',
      proposed_end_date: project?.proposed_end_date ?? '',
      announcement_date: project?.announcement_date ?? '',
      announcing_entity: project?.announcing_entity ?? '',
      priority: project?.priority ?? '',
      research_opinion: project?.research_opinion ?? '',
      board_opinion: project?.board_opinion ?? '',
    }),
    resetDependencies: [project],
  })

  const applyOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setPendingFiles([])
    }
    onOpenChange(nextOpen)
  }

  const { discardOpen, handleOpenChange, confirmDiscard, cancelDiscard } =
    useFormDialogClose(isDirty, applyOpenChange)

  const selectedCurrency = useWatch({
    control: form.control,
    name: 'currency',
  })
  const selectedPriority = useWatch({
    control: form.control,
    name: 'priority',
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
        field === 'announcement_date' ||
        field === 'announcing_entity' ||
        field === 'priority' ||
        field === 'research_opinion' ||
        field === 'board_opinion'
      ) {
        form.setError(field, { message: issue.message })
      }
    }
  }

  const applyCodeConflictError = (error: unknown) => {
    if (matchMutationErrorKey(error) === 'validation.projectCodeTaken') {
      form.setError('code', { message: t('validation.projectCodeTaken') })
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
          announcement_date: values.announcement_date ?? '',
          announcing_entity: values.announcing_entity ?? '',
          priority: values.priority ?? '',
          research_opinion: values.research_opinion ?? '',
          board_opinion: values.board_opinion ?? '',
        },
        files: pendingFiles,
      })
      closeDialog()
    } catch (error) {
      applyCodeConflictError(error)
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
          announcement_date: parsed.data.announcement_date ?? '',
          announcing_entity: parsed.data.announcing_entity ?? '',
          priority: parsed.data.priority ?? '',
          research_opinion: parsed.data.research_opinion ?? '',
          board_opinion: parsed.data.board_opinion ?? '',
        },
        files: pendingFiles,
      })
      closeDialog()
    } catch (error) {
      applyCodeConflictError(error)
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

          <form className="flex min-h-0 flex-1 flex-col">
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
                  <DatePickerField
                    id="project-start"
                    control={form.control}
                    name="proposed_start_date"
                    allowClear
                  />
                  <FormFieldError
                    error={form.formState.errors.proposed_start_date}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project-end">
                    {t('projects.proposedEndDate')}
                  </Label>
                  <DatePickerField
                    id="project-end"
                    control={form.control}
                    name="proposed_end_date"
                    allowClear
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="project-announcement-date">
                    {t('projects.announcementDate')}
                  </Label>
                  <DatePickerField
                    id="project-announcement-date"
                    control={form.control}
                    name="announcement_date"
                    allowClear
                  />
                  <FormFieldError
                    error={form.formState.errors.announcement_date}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project-announcing-entity">
                    {t('projects.announcingEntity')}
                  </Label>
                  <Input
                    id="project-announcing-entity"
                    {...form.register('announcing_entity')}
                  />
                  <FormFieldError
                    error={form.formState.errors.announcing_entity}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('projects.priority')}</Label>
                <Select
                  value={formatNullableSelectValue(selectedPriority || null)}
                  onValueChange={(value) => {
                    const next = parseNullableSelectValue(value)
                    form.setValue(
                      'priority',
                      next === 'high' || next === 'medium' || next === 'low'
                        ? next
                        : '',
                      { shouldDirty: true },
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
                    {PROJECT_PRIORITIES.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {t(`projects.priorityLabels.${priority}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormFieldError error={form.formState.errors.priority} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-research-opinion">
                  {t('projects.researchOpinion')}
                </Label>
                <Textarea
                  id="project-research-opinion"
                  rows={3}
                  {...form.register('research_opinion')}
                />
                <FormFieldError
                  error={form.formState.errors.research_opinion}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-board-opinion">
                  {t('projects.boardOpinion')}
                </Label>
                <Textarea
                  id="project-board-opinion"
                  rows={3}
                  {...form.register('board_opinion')}
                />
                <FormFieldError error={form.formState.errors.board_opinion} />
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
                onClick={() => handleOpenChange(false)}
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

      <DiscardChangesDialog
        open={discardOpen}
        onConfirm={confirmDiscard}
        onCancel={cancelDiscard}
      />
    </>
  )
}
