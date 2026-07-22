import { formatFactoryLabel } from '@/lib/i18n-format'
import type { ActiveInactiveFilter } from '@/lib/list-query-params'

type TranslateFn = (key: string) => string

type FilterOption = {
  value: string
  label: string
}

type ActiveFilterableQuery = {
  eq: (column: string, value: boolean) => ActiveFilterableQuery
}

export function getActiveInactiveFilterOptions(t: TranslateFn): FilterOption[] {
  return [
    { value: 'all', label: t('list.all') },
    { value: 'active', label: t('list.activeOnly') },
    { value: 'inactive', label: t('list.inactiveOnly') },
  ]
}

export function buildFactoryFilterOptions(
  factories: Array<{ id: string; name: string; code: string }>,
  allLabel: string,
): FilterOption[] {
  return [
    { value: 'all', label: allLabel },
    ...factories.map((factory) => ({
      value: factory.id,
      label: formatFactoryLabel(factory),
    })),
  ]
}

export function applyActiveStatusFilter<T extends ActiveFilterableQuery>(
  query: T,
  status: ActiveInactiveFilter,
): T {
  if (status === 'active') {
    return query.eq('is_active', true) as T
  }

  if (status === 'inactive') {
    return query.eq('is_active', false) as T
  }

  return query
}
