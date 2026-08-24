import { describe, expect, it } from 'vitest'
import { buildCsv, escapeCsvCell } from '@/lib/export-spreadsheet'
import { formatDateOnly, parseDateOnly } from '@/lib/date-only'

describe('export spreadsheet', () => {
  it('escapes commas quotes and newlines', () => {
    expect(escapeCsvCell('plain')).toBe('plain')
    expect(escapeCsvCell('a,b')).toBe('"a,b"')
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""')
    expect(escapeCsvCell(true)).toBe('Yes')
    expect(escapeCsvCell(null)).toBe('')
  })

  it('builds a BOM-prefixed csv with headers', () => {
    const csv = buildCsv(
      [
        { header: 'Title', value: (row: { title: string }) => row.title },
        { header: 'Count', value: (row: { count: number }) => row.count },
      ],
      [{ title: 'Alpha, Inc', count: 2 }],
    )

    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('Title,Count')
    expect(csv).toContain('"Alpha, Inc",2')
  })
})

describe('date-only helpers', () => {
  it('parses and formats local calendar dates', () => {
    const parsed = parseDateOnly('2026-08-24')
    expect(parsed?.getFullYear()).toBe(2026)
    expect(parsed?.getMonth()).toBe(7)
    expect(parsed?.getDate()).toBe(24)
    expect(formatDateOnly(new Date(2026, 7, 24))).toBe('2026-08-24')
  })

  it('rejects invalid dates', () => {
    expect(parseDateOnly('2026-13-01')).toBeUndefined()
    expect(parseDateOnly('not-a-date')).toBeUndefined()
  })
})
