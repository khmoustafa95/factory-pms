import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { FileDropzone } from '@/components/files/FileDropzone'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslation } from '@/contexts/LocaleContext'
import { useProjectFieldDefinitions, useUpsertProjectFieldValues } from '@/hooks/useProjectCustomFields'
import { useCreateProject, useFactoryProjectManagers } from '@/hooks/useProjects'
import { downloadSpreadsheet } from '@/lib/export-spreadsheet'
import {
  autoMapColumns,
  mappedRecord,
  MAX_IMPORT_ROWS,
  parseCsv,
  parseImportBudget,
  parseImportDate,
  PROJECT_IMPORT_FIELD_KEYS,
  rowToRecord,
  type ProjectImportFieldKey,
} from '@/lib/import-spreadsheet'
import { toastMutationError } from '@/lib/mutation-error'
import { fieldDefinitionLabel, validateFieldValue } from '@/lib/project-custom-fields'
import { createDraftProjectSchema, type ProjectFormValues } from '@/lib/validations/project'
import { getSupabase } from '@/lib/supabase'

const SKIP_MAPPING = '__skip__'

type WizardStep = 'upload' | 'map' | 'preview'

type PreviewRow = {
  index: number
  values: ProjectFormValues
  customValues: Record<string, string>
  errors: string[]
}

function emptyProjectValues(): ProjectFormValues {
  return {
    code: '',
    title: '',
    description: '',
    budget: '',
    currency: 'USD',
    proposed_start_date: '',
    proposed_end_date: '',
    assigned_pm_id: null,
  }
}

export function ProjectImportWizard({
  open,
  onOpenChange,
  factoryId,
  userId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  factoryId: string
  userId: string
}) {
  const { t, locale } = useTranslation()
  const { data: definitions = [] } = useProjectFieldDefinitions(true)
  const { data: managers = [] } = useFactoryProjectManagers(factoryId)
  const createProject = useCreateProject()
  const upsertFields = useUpsertProjectFieldValues()
  const [step, setStep] = useState<WizardStep>('upload')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [fileName, setFileName] = useState('')
  const [isImporting, setIsImporting] = useState(false)

  const targetKeys = useMemo(
    () => [...PROJECT_IMPORT_FIELD_KEYS, ...definitions.map((item) => item.key)],
    [definitions],
  )

  const reset = () => {
    setStep('upload')
    setHeaders([])
    setRows([])
    setMapping({})
    setFileName('')
    setIsImporting(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset()
    }
    onOpenChange(next)
  }

  const handleFiles = async (files: File[]) => {
    const file = files[0]
    if (!file) {
      return
    }
    try {
      const text = await file.text()
      const table = parseCsv(text)
      if (table.headers.length === 0) {
        toast.error(t('projects.import.emptyFile'))
        return
      }
      if (table.rows.length === 0) {
        toast.error(t('projects.import.emptyFile'))
        return
      }
      if (table.rows.length > MAX_IMPORT_ROWS) {
        toast.error(t('projects.import.tooManyRows', { count: MAX_IMPORT_ROWS }))
        return
      }
      setFileName(file.name)
      setHeaders(table.headers)
      setRows(table.rows)
      setMapping(autoMapColumns(table.headers, targetKeys))
      setStep('map')
    } catch {
      toast.error(t('projects.import.parseFailed'))
    }
  }

  const downloadTemplate = () => {
    const columns = targetKeys.map((key) => ({
      header: key,
      value: () => '',
    }))
    downloadSpreadsheet('project-import-template', columns, [{}])
  }

  const previewRows = useMemo((): PreviewRow[] => {
    const schema = createDraftProjectSchema(t)
    const managerByEmail = new Map(
      managers.map((manager) => [manager.email.toLowerCase(), manager.id]),
    )
    const seenCodes = new Set<string>()

    return rows.map((row, index) => {
      const record = mappedRecord(rowToRecord(headers, row), mapping)
      const errors: string[] = []
      const values = emptyProjectValues()
      const customValues: Record<string, string> = {}

      values.code = (record.code ?? '').trim().toUpperCase()
      values.title = (record.title ?? '').trim()
      values.description = (record.description ?? '').trim()
      values.budget = parseImportBudget(record.budget ?? '')
      values.currency = (record.currency ?? 'USD').trim().toUpperCase() || 'USD'
      values.proposed_start_date =
        parseImportDate(record.proposed_start_date ?? '') ??
        (record.proposed_start_date?.trim() ? record.proposed_start_date.trim() : '')
      values.proposed_end_date =
        parseImportDate(record.proposed_end_date ?? '') ??
        (record.proposed_end_date?.trim() ? record.proposed_end_date.trim() : '')

      if (!values.title) {
        errors.push(t('validation.titleMin'))
      }

      if (values.proposed_start_date && !parseImportDate(values.proposed_start_date)) {
        errors.push(t('validation.dateInvalid'))
      }
      if (values.proposed_end_date && !parseImportDate(values.proposed_end_date)) {
        errors.push(t('validation.dateInvalid'))
      }

      const pmEmail = (record.assigned_pm_email ?? '').trim().toLowerCase()
      if (pmEmail) {
        const pmId = managerByEmail.get(pmEmail)
        if (pmId) {
          values.assigned_pm_id = pmId
        } else {
          errors.push(t('projects.import.unknownPm', { email: pmEmail }))
        }
      }

      if (values.code) {
        if (seenCodes.has(values.code)) {
          errors.push(t('projects.import.duplicateCode', { code: values.code }))
        }
        seenCodes.add(values.code)
      }

      const parsed = schema.safeParse(values)
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          errors.push(issue.message)
        }
      }

      for (const definition of definitions) {
        const raw = record[definition.key] ?? ''
        const error = validateFieldValue(definition, raw, t)
        if (error) {
          errors.push(`${fieldDefinitionLabel(definition, locale)}: ${error}`)
        } else if (raw.trim()) {
          customValues[definition.id] = raw.trim()
        }
      }

      return { index: index + 2, values, customValues, errors }
    })
  }, [definitions, headers, locale, managers, mapping, rows, t])

  const validRows = previewRows.filter((row) => row.errors.length === 0)
  const invalidRows = previewRows.filter((row) => row.errors.length > 0)

  const handleImport = async () => {
    setIsImporting(true)
    try {
      const supabase = getSupabase()
      const { data: existing, error } = await supabase
        .from('projects')
        .select('code')
        .eq('factory_id', factoryId)

      if (error) {
        throw error
      }

      const existingCodes = new Set(
        (existing ?? []).map((row) => row.code.toUpperCase()),
      )
      let created = 0
      let skipped = 0

      for (const row of validRows) {
        const code = row.values.code.trim().toUpperCase()
        if (code && existingCodes.has(code)) {
          skipped += 1
          continue
        }

        const createdProject = await createProject.mutateAsync({
          factoryId,
          userId,
          values: row.values,
          status: 'draft',
        })
        existingCodes.add(createdProject.code.toUpperCase())
        if (Object.keys(row.customValues).length > 0) {
          await upsertFields.mutateAsync({
            projectId: createdProject.id,
            values: row.customValues,
          })
        }
        created += 1
      }

      toast.success(
        t('projects.import.success', { created, skipped, failed: invalidRows.length }),
      )
      handleOpenChange(false)
    } catch (submitError) {
      toastMutationError(submitError, t('projects.import.failed'), t)
    } finally {
      setIsImporting(false)
    }
  }

  const targetLabel = (key: string) => {
    if ((PROJECT_IMPORT_FIELD_KEYS as readonly string[]).includes(key)) {
      return t(`projects.import.fields.${key as ProjectImportFieldKey}`)
    }
    const definition = definitions.find((item) => item.key === key)
    return definition ? fieldDefinitionLabel(definition, locale) : key
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('projects.import.title')}</DialogTitle>
          <DialogDescription>
            {t('projects.import.description')}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {step === 'upload' ? (
            <>
              <FileDropzone
                accept=".csv,text/csv"
                multiple={false}
                idleLabel={t('projects.import.dropHint')}
                activeLabel={t('projects.import.dropActive')}
                onFiles={(files) => void handleFiles(files)}
              />
              <Button type="button" variant="outline" onClick={downloadTemplate}>
                {t('projects.import.downloadTemplate')}
              </Button>
            </>
          ) : null}

          {step === 'map' ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t('projects.import.mapHint', { file: fileName })}
              </p>
              {targetKeys.map((key) => (
                <div key={key} className="grid grid-cols-[1fr_1fr] items-center gap-2">
                  <Label className="text-sm">{targetLabel(key)}</Label>
                  <Select
                    value={mapping[key] || SKIP_MAPPING}
                    onValueChange={(value) =>
                      setMapping((current) => ({
                        ...current,
                        [key]: value === SKIP_MAPPING ? '' : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SKIP_MAPPING}>
                        {t('projects.import.skipColumn')}
                      </SelectItem>
                      {headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          ) : null}

          {step === 'preview' ? (
            <div className="space-y-3 text-sm">
              <p>
                {t('projects.import.previewSummary', {
                  valid: validRows.length,
                  invalid: invalidRows.length,
                })}
              </p>
              {invalidRows.slice(0, 8).map((row) => (
                <div key={row.index} className="rounded-md border border-destructive/30 p-2">
                  <p className="font-medium">
                    {t('projects.import.rowLabel', { row: row.index })}
                  </p>
                  <p className="text-destructive">{row.errors.join(' · ')}</p>
                </div>
              ))}
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter>
          {step === 'upload' ? (
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('common.cancel')}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(step === 'preview' ? 'map' : 'upload')}
            >
              {t('common.back')}
            </Button>
          )}
          {step === 'map' ? (
            <Button type="button" onClick={() => setStep('preview')}>
              {t('projects.import.preview')}
            </Button>
          ) : null}
          {step === 'preview' ? (
            <Button
              type="button"
              disabled={validRows.length === 0 || isImporting}
              onClick={() => void handleImport()}
            >
              {isImporting
                ? t('projects.import.importing')
                : t('projects.import.importRows', { count: validRows.length })}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
