import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslation } from '@/contexts/LocaleContext'
import { formatLocalizedDate } from '@/lib/i18n-format'
import { fieldDefinitionLabel } from '@/lib/project-custom-fields'
import { useProjectFieldDefinitions, useProjectFieldValues } from '@/hooks/useProjectCustomFields'

export function ProjectCustomFieldsCard({ projectId }: { projectId: string }) {
  const { t, locale } = useTranslation()
  const { data: definitions = [] } = useProjectFieldDefinitions(true)
  const { data: values = [] } = useProjectFieldValues(projectId)
  const valueById = new Map(values.map((row) => [row.field_id, row.value]))
  const visible = definitions.filter(
    (definition) => (valueById.get(definition.id) ?? '') !== '',
  )

  if (definitions.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('projects.customFields')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('projects.customFieldsEmpty')}
          </p>
        ) : (
          visible.map((definition) => {
            const raw = valueById.get(definition.id) ?? ''
            let display = raw
            if (definition.field_type === 'boolean') {
              display = raw === 'true' ? t('common.yes') : t('common.no')
            } else if (definition.field_type === 'date') {
              display = formatLocalizedDate(raw, locale)
            }

            return (
              <div
                key={definition.id}
                className="flex items-baseline justify-between gap-4 text-sm"
              >
                <span className="text-muted-foreground">
                  {fieldDefinitionLabel(definition, locale)}
                </span>
                <span className="text-end font-medium">{display}</span>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
