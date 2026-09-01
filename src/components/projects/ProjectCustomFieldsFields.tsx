import { useLayoutEffect, useState, type MutableRefObject } from 'react'
import { DatePicker } from '@/components/DatePicker'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useTranslation } from '@/contexts/LocaleContext'
import {
  fieldDefinitionLabel,
  initialFieldValue,
} from '@/lib/project-custom-fields'
import type { ProjectFieldDefinition, ProjectFieldValue } from '@/types/database'

export function ProjectCustomFieldsFields({
  definitions,
  storedValues,
  valuesRef,
  disabled = false,
}: {
  definitions: ProjectFieldDefinition[]
  storedValues: ProjectFieldValue[]
  valuesRef: MutableRefObject<Record<string, string>>
  disabled?: boolean
}) {
  const { t, locale } = useTranslation()
  const storedById = new Map(
    storedValues.map((row) => [row.field_id, row.value]),
  )
  const [values, setValues] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {}
    for (const definition of definitions) {
      next[definition.id] = initialFieldValue(
        definition,
        storedById.get(definition.id),
      )
    }
    return next
  })

  useLayoutEffect(() => {
    valuesRef.current = values
  }, [values, valuesRef])

  if (definitions.length === 0) {
    return null
  }

  const setField = (fieldId: string, value: string) => {
    setValues((current) => ({ ...current, [fieldId]: value }))
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">{t('projects.customFields')}</p>
      {definitions.map((definition) => {
        const label = fieldDefinitionLabel(definition, locale)
        const value = values[definition.id] ?? ''
        const fieldId = `custom-field-${definition.key}`

        return (
          <div key={definition.id} className="space-y-2">
            <Label htmlFor={fieldId}>
              {label}
              {definition.is_required ? ' *' : ''}
            </Label>
            {definition.field_type === 'text' ? (
              <Input
                id={fieldId}
                value={value}
                disabled={disabled}
                onChange={(event) => setField(definition.id, event.target.value)}
              />
            ) : null}
            {definition.field_type === 'number' ? (
              <Input
                id={fieldId}
                type="number"
                inputMode="decimal"
                value={value}
                disabled={disabled}
                onChange={(event) => setField(definition.id, event.target.value)}
              />
            ) : null}
            {definition.field_type === 'date' ? (
              <DatePicker
                id={fieldId}
                value={value}
                allowClear={!definition.is_required}
                disabled={disabled}
                onChange={(next) => setField(definition.id, next)}
              />
            ) : null}
            {definition.field_type === 'boolean' ? (
              <div className="flex items-center gap-2">
                <Switch
                  id={fieldId}
                  checked={value === 'true'}
                  disabled={disabled}
                  onCheckedChange={(checked) =>
                    setField(definition.id, checked ? 'true' : 'false')
                  }
                />
                <Label htmlFor={fieldId} className="font-normal">
                  {value === 'true' ? t('common.yes') : t('common.no')}
                </Label>
              </div>
            ) : null}
            {definition.field_type === 'select' ? (
              <Select
                value={value || undefined}
                onValueChange={(next) => setField(definition.id, next)}
                disabled={disabled}
              >
                <SelectTrigger id={fieldId}>
                  <SelectValue placeholder={t('common.optional')} />
                </SelectTrigger>
                <SelectContent>
                  {definition.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
