import { describe, expect, it } from 'vitest'
import {
  autoMapColumns,
  mappedRecord,
  parseCsv,
  parseImportBudget,
  parseImportDate,
  rowToRecord,
} from '@/lib/import-spreadsheet'

describe('parseCsv', () => {
  it('parses BOM, quoted commas, and blank lines', () => {
    const table = parseCsv(
      '\uFEFFcode,title,description\r\nPRJ-1,"Plant, north",Line A\n\nPRJ-2,South,""\n',
    )
    expect(table.headers).toEqual(['code', 'title', 'description'])
    expect(table.rows).toEqual([
      ['PRJ-1', 'Plant, north', 'Line A'],
      ['PRJ-2', 'South', ''],
    ])
  })

  it('throws on unterminated quotes', () => {
    expect(() => parseCsv('code,title\nA,"B')).toThrow(/Unterminated/)
  })
})

describe('column mapping', () => {
  it('auto-maps normalized headers', () => {
    const mapping = autoMapColumns(
      ['Code', 'title', 'Budget'],
      ['code', 'title', 'budget'],
    )
    expect(mapping).toEqual({
      code: 'Code',
      title: 'title',
      budget: 'Budget',
    })
  })

  it('maps a row through the chosen headers', () => {
    const record = rowToRecord(['Code', 'Title'], ['A1', 'Road'])
    expect(mappedRecord(record, { code: 'Code', title: 'Title' })).toEqual({
      code: 'A1',
      title: 'Road',
    })
  })
})

describe('import cell helpers', () => {
  it('parses ISO and slash dates', () => {
    expect(parseImportDate('2026-08-15')).toBe('2026-08-15')
    expect(parseImportDate('15/08/2026')).toBe('2026-08-15')
    expect(parseImportDate('nope')).toBeNull()
  })

  it('strips thousands separators from budget', () => {
    expect(parseImportBudget('1,250.50')).toBe('1250.50')
  })
})
