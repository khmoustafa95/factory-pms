import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { FormFieldError } from '@/components/FormFieldError'
import { QueryState } from '@/components/QueryState'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogBody,
  DialogContent,
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useTranslation } from '@/contexts/LocaleContext'
import {
  useCreateProjectFieldDefinition,
  useDeleteProjectFieldDefinition,
  useProjectFieldDefinitions,
  useUpdateProjectFieldDefinition,
} from '@/hooks/useProjectCustomFields'
import { fieldDefinitionLabel, parseSelectOptions, PROJECT_FIELD_TYPES } from '@/lib/project-custom-fields'
import { toastMutationError } from '@/lib/mutation-error'
import type { ProjectFieldDefinition, ProjectFieldType } from '@/types/database'

type FieldFormValues = {
  key: string
  label_en: string
  label_ar: string
  field_type: ProjectFieldType
  optionsText: string
  is_required: boolean
  is_active: boolean
}

const EMPTY_FORM: FieldFormValues = {
  key: '',
  label_en: '',
  label_ar: '',
  field_type: 'text',
  optionsText: '',
  is_required: false,
  is_active: true,
}

export function CustomFieldsSettingsTab() {
  const { t, locale } = useTranslation()
  const {
    data: definitions = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useProjectFieldDefinitions()
  const createDefinition = useCreateProjectFieldDefinition()
  const updateDefinition = useUpdateProjectFieldDefinition()
  const deleteDefinition = useDeleteProjectFieldDefinition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ProjectFieldDefinition | null>(null)

  const schema = useMemo(
    () =>
      z
        .object({
          key: z
            .string()
            .trim()
            .regex(/^[a-z][a-z0-9_]{1,31}$/, t('validation.fieldKeyFormat')),
          label_en: z.string().trim().min(2, t('validation.nameMin')),
          label_ar: z.string().trim().min(2, t('validation.nameMin')),
          field_type: z.enum([
            'text',
            'number',
            'date',
            'boolean',
            'select',
          ]),
          optionsText: z.string(),
          is_required: z.boolean(),
          is_active: z.boolean(),
        })
        .superRefine((values, ctx) => {
          if (
            values.field_type === 'select' &&
            parseSelectOptions(values.optionsText).length === 0
          ) {
            ctx.addIssue({
              code: 'custom',
              path: ['optionsText'],
              message: t('validation.selectOptionsRequired'),
            })
          }
        }),
    [t],
  )

  const form = useForm<FieldFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_FORM,
  })

  const fieldType = useWatch({ control: form.control, name: 'field_type' })
  const isRequired = useWatch({ control: form.control, name: 'is_required' })
  const isActive = useWatch({ control: form.control, name: 'is_active' })

  const openCreate = () => {
    setEditing(null)
    form.reset(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (definition: ProjectFieldDefinition) => {
    setEditing(definition)
    form.reset({
      key: definition.key,
      label_en: definition.label_en,
      label_ar: definition.label_ar,
      field_type: definition.field_type,
      optionsText: definition.options.join('\n'),
      is_required: definition.is_required,
      is_active: definition.is_active,
    })
    setDialogOpen(true)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      key: values.key.trim(),
      label_en: values.label_en.trim(),
      label_ar: values.label_ar.trim(),
      field_type: values.field_type,
      options:
        values.field_type === 'select'
          ? parseSelectOptions(values.optionsText)
          : [],
      is_required: values.is_required,
      is_active: values.is_active,
      sort_order: editing?.sort_order ?? definitions.length,
    }

    try {
      if (editing) {
        await updateDefinition.mutateAsync({ id: editing.id, ...payload })
        toast.success(t('settings.customFields.updated'))
      } else {
        await createDefinition.mutateAsync(payload)
        toast.success(t('settings.customFields.created'))
      }
      setDialogOpen(false)
    } catch (submitError) {
      toastMutationError(submitError, t('settings.saveFailed'), t)
    }
  })

  const handleDelete = async (definition: ProjectFieldDefinition) => {
    try {
      await deleteDefinition.mutateAsync(definition.id)
      toast.success(t('settings.customFields.deleted'))
    } catch (submitError) {
      toastMutationError(submitError, t('settings.saveFailed'), t)
    }
  }

  const isMutating =
    createDefinition.isPending ||
    updateDefinition.isPending ||
    deleteDefinition.isPending

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>{t('settings.customFields.title')}</CardTitle>
              <CardDescription>
                {t('settings.customFields.description')}
              </CardDescription>
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4" />
              {t('settings.customFields.add')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <QueryState
            isLoading={isLoading}
            error={error}
            onRetry={() => void refetch()}
            isRetrying={isFetching}
            loadingMessage={t('common.loading')}
            errorMessage={t('settings.customFields.loadFailed')}
          >
            {definitions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('settings.customFields.empty')}
              </p>
            ) : (
              <div className="space-y-2">
                {definitions.map((definition) => (
                  <div
                    key={definition.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-medium">
                        {fieldDefinitionLabel(definition, locale)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {definition.key} · {t(`customFieldType.${definition.field_type}`)}
                        {definition.is_required
                          ? ` · ${t('common.required')}`
                          : ''}
                        {definition.is_active
                          ? ''
                          : ` · ${t('common.inactive')}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => openEdit(definition)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive"
                        disabled={isMutating}
                        onClick={() => void handleDelete(definition)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </QueryState>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? t('settings.customFields.editTitle')
                : t('settings.customFields.addTitle')}
            </DialogTitle>
          </DialogHeader>
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
            <DialogBody className="space-y-4">
              <div className="space-y-2">
                <Label>{t('settings.customFields.key')}</Label>
                <Input
                  className="font-mono"
                  disabled={Boolean(editing)}
                  {...form.register('key')}
                />
                <p className="text-xs text-muted-foreground">
                  {t('settings.customFields.keyHelp')}
                </p>
                <FormFieldError error={form.formState.errors.key} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('settings.customFields.labelEn')}</Label>
                  <Input {...form.register('label_en')} />
                  <FormFieldError error={form.formState.errors.label_en} />
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.customFields.labelAr')}</Label>
                  <Input dir="rtl" {...form.register('label_ar')} />
                  <FormFieldError error={form.formState.errors.label_ar} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('settings.customFields.fieldType')}</Label>
                <Select
                  value={fieldType}
                  onValueChange={(value) =>
                    form.setValue('field_type', value as ProjectFieldType)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_FIELD_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`customFieldType.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {fieldType === 'select' ? (
                <div className="space-y-2">
                  <Label>{t('settings.customFields.options')}</Label>
                  <Textarea rows={4} {...form.register('optionsText')} />
                  <p className="text-xs text-muted-foreground">
                    {t('settings.customFields.optionsHelp')}
                  </p>
                  <FormFieldError error={form.formState.errors.optionsText} />
                </div>
              ) : null}
              <div className="flex items-center gap-2">
                <Switch
                  checked={isRequired}
                  onCheckedChange={(checked) =>
                    form.setValue('is_required', checked)
                  }
                />
                <Label>{t('common.required')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={isActive}
                  onCheckedChange={(checked) =>
                    form.setValue('is_active', checked)
                  }
                />
                <Label>{t('common.active')}</Label>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isMutating}>
                {isMutating ? t('common.saving') : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
