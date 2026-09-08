import { describe, expect, it } from 'vitest'
import { createTranslator } from '@/i18n/translate'
import { en } from '@/i18n/locales/en'
import {
  classifyProjectUpserts,
  parseProjectImportRows,
  parseProjectPriority,
  PROJECT_IMPORT_COLUMNS,
  type ProjectImportFactory,
} from '@/lib/import/projects-import'

const t = createTranslator(en)

const FACTORIES: ProjectImportFactory[] = [
  { id: 'factory-dms', code: 'DMS' },
  { id: 'factory-alp', code: 'ALP' },
]

const HEADER = [...PROJECT_IMPORT_COLUMNS]

function dataRow(
  overrides: Partial<Record<(typeof PROJECT_IMPORT_COLUMNS)[number], string>> = {},
  header: readonly string[] = HEADER,
): string[] {
  const values: Record<(typeof PROJECT_IMPORT_COLUMNS)[number], string> = {
    factory_code: 'DMS',
    code: 'PRJ-001',
    title: 'Cooling upgrade',
    description: '',
    budget: '150000',
    currency: 'USD',
    proposed_duration_months: '6',
    announcement_date: '',
    announcing_entity: '',
    priority: '',
    research_opinion: '',
    board_opinion: '',
    ...overrides,
  }

  return header.map((column) => values[column as (typeof PROJECT_IMPORT_COLUMNS)[number]])
}

describe('parseProjectPriority', () => {
  it('accepts English and Arabic labels and treats blank as unset', () => {
    expect(parseProjectPriority('')).toBeNull()
    expect(parseProjectPriority('HIGH')).toBe('high')
    expect(parseProjectPriority('متوسطة')).toBe('medium')
    expect(parseProjectPriority('منخفضة')).toBe('low')
    expect(parseProjectPriority('urgent')).toBeUndefined()
  })
})

describe('parseProjectImportRows', () => {
  it('rejects a missing or extra header column', () => {
    expect(
      parseProjectImportRows([['factory_code', 'code', 'title']], t, {
        factories: FACTORIES,
      }).ok,
    ).toBe(false)
    expect(
      parseProjectImportRows(
        [[...HEADER, 'id'], dataRow()],
        t,
        { factories: FACTORIES },
      ).ok,
    ).toBe(false)
  })

  it('rejects a header that does not match the projects template', () => {
    const result = parseProjectImportRows(
      [['factory_code', 'name', ...HEADER.slice(2)], dataRow()],
      t,
      { factories: FACTORIES },
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors[0]?.message).toBe(
        t('projects.import.headerMismatch'),
      )
    }
  })

  it('parses duration months and optional announcement fields', () => {
    const customHeader = [...HEADER]
    const result = parseProjectImportRows(
      [
        customHeader,
        dataRow(
          {
            factory_code: 'dms',
            code: 'prj-001',
            description: 'Scope notes',
            announcement_date: '2026-03-01',
            announcing_entity: 'Ministry of Industry',
            priority: 'high',
            research_opinion: 'Approved by research',
            board_opinion: 'Board agrees',
          },
          customHeader,
        ),
        dataRow(
          {
            factory_code: 'ALP',
            code: 'PRJ-002',
            title: 'New packing line',
            budget: '',
            currency: '',
            proposed_duration_months: '',
          },
          customHeader,
        ),
      ],
      t,
      { factories: FACTORIES },
    )

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.payloads).toEqual([
      {
        factory_id: 'factory-dms',
        code: 'PRJ-001',
        title: 'Cooling upgrade',
        description: 'Scope notes',
        budget: 150000,
        currency: 'USD',
        proposed_duration_value: 6,
        proposed_duration_unit: 'month',
        announcement_date: '2026-03-01',
        announcing_entity: 'Ministry of Industry',
        priority: 'high',
        research_opinion: 'Approved by research',
        board_opinion: 'Board agrees',
      },
      {
        factory_id: 'factory-alp',
        code: 'PRJ-002',
        title: 'New packing line',
        description: null,
        budget: null,
        currency: 'USD',
        proposed_duration_value: null,
        proposed_duration_unit: null,
        announcement_date: null,
        announcing_entity: null,
        priority: null,
        research_opinion: null,
        board_opinion: null,
      },
    ])

    const classified = classifyProjectUpserts(result.payloads, [
      { factory_id: 'factory-dms', code: 'PRJ-001' },
    ])
    expect(classified.toUpdate.map((row) => row.code)).toEqual(['PRJ-001'])
    expect(classified.toInsert.map((row) => row.code)).toEqual(['PRJ-002'])
  })

  it('skips empty data rows and rejects a header-only file', () => {
    expect(
      parseProjectImportRows([HEADER, Array(HEADER.length).fill('')], t, {
        factories: FACTORIES,
      }).ok,
    ).toBe(false)

    const result = parseProjectImportRows(
      [HEADER, Array(3).fill(''), dataRow({ code: 'PRJ-009' })],
      t,
      { factories: FACTORIES },
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.payloads).toHaveLength(1)
      expect(result.payloads[0]?.code).toBe('PRJ-009')
    }
  })

  it('rejects files that exceed the row cap', () => {
    const rows = [HEADER, ...Array.from({ length: 501 }, (_, index) =>
      dataRow({ code: `PRJ-${String(index + 1).padStart(3, '0')}` }),
    )]
    const result = parseProjectImportRows(rows, t, {
      factories: FACTORIES,
      maxRows: 500,
    })
    expect(result.ok).toBe(false)
  })
})
