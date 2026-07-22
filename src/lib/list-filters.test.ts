import { describe, expect, it } from 'vitest'
import { formatFactoryLabel } from '@/lib/i18n-format'
import {
  applyActiveStatusFilter,
  buildFactoryFilterOptions,
  getActiveInactiveFilterOptions,
} from '@/lib/list-filters'

describe('getActiveInactiveFilterOptions', () => {
  it('returns translated active/inactive filter options', () => {
    const t = (key: string) => key

    expect(getActiveInactiveFilterOptions(t)).toEqual([
      { value: 'all', label: 'list.all' },
      { value: 'active', label: 'list.activeOnly' },
      { value: 'inactive', label: 'list.inactiveOnly' },
    ])
  })
})

describe('buildFactoryFilterOptions', () => {
  it('prepends the all option and formats factory labels', () => {
    const factories = [
      { id: '1', name: 'Alpha', code: 'ALP' },
      { id: '2', name: 'Beta', code: 'BET' },
    ]

    expect(buildFactoryFilterOptions(factories, 'All factories')).toEqual([
      { value: 'all', label: 'All factories' },
      { value: '1', label: formatFactoryLabel(factories[0]) },
      { value: '2', label: formatFactoryLabel(factories[1]) },
    ])
  })
})

describe('applyActiveStatusFilter', () => {
  it('applies active and inactive filters', () => {
    const calls: Array<[string, boolean]> = []
    const query = {
      eq: (column: string, value: boolean) => {
        calls.push([column, value])
        return query
      },
    }

    applyActiveStatusFilter(query, 'active')
    applyActiveStatusFilter(query, 'inactive')
    applyActiveStatusFilter(query, 'all')

    expect(calls).toEqual([
      ['is_active', true],
      ['is_active', false],
    ])
  })
})
