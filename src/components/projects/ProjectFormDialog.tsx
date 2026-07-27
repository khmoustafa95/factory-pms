import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useWatch } from 'react-hook-form'
import { FormFieldError } from '@/components/FormFieldError'
import { ProposalFilePicker } from '@/components/projects/ProposalFilePicker'
import { Button } from '@/components/ui/button'
import {
  Dialog,
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
import { useActiveCurrencies } from '@/hooks/useCurrencies'
import { useFactoryProjectManagers } from '@/hooks/useProjects'
import { useValidationSchema } from '@/hooks/useValidationSchema'
import {
  formatNullableSelectValue,
  NULL_SELECT_VALUE,
  parseNullableSelectValue,
} from '@/lib/form-utils'
import {
  createProjectFormSchema,
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
  title: '',
  description: '',
  budget: '',
  currency: 'USD',
  proposed_start_date: undefined,
  proposed_end_date: undefined,
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
  const { data: projectManagers = [] } = useFactoryProjectManagers(factoryId)
  const projectFormSchema = useValidationSchema(createProjectFormSchema)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  const { form, createSubmitHandler } = useFormDialog({
    open,
    resolver: zodResolver(projectFormSchema),
    defaultValues: PROJECT_FORM_DEFAULTS,
    getValues: () => ({
      title: project?.title ?? '',
      description: project?.description ?? '',
      budget: project?.budget != null ? String(project.budget) : '',
      currency: project?.currency ?? 'USD',
      proposed_start_date: project?.proposed_start_date ?? undefined,
      proposed_end_date: project?.proposed_end_date ?? undefined,
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

  const closeDialog = () => {
    setPendingFiles([])
    onOpenChange(false)
  }

  const saveDraft = createSubmitHandler(
    (values) => onSaveDraft({ values, files: pendingFiles }),
    closeDialog,
  )
  const submitProposal = createSubmitHandler(
    (values) => onSubmitProposal({ values, files: pendingFiles }),
    closeDialog,
  )
  const isDetailsEdit = Boolean(project) && !allowSubmitProposal

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
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

        <form key={locale} className="space-y-4">
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
                {t('projects.proposedStart')}
              </Label>
              <Input
                id="project-start"
                type="date"
                {...form.register('proposed_start_date')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-end">{t('projects.proposedEnd')}</Label>
              <Input
                id="project-end"
                type="date"
                {...form.register('proposed_end_date')}
              />
              <FormFieldError error={form.formState.errors.proposed_end_date} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('projects.assignedPm')}</Label>
            <Select
              value={formatNullableSelectValue(selectedPmId)}
              onValueChange={(value) =>
                form.setValue('assigned_pm_id', parseNullableSelectValue(value))
              }
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
              </SelectContent>
            </Select>
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
  )
}
