import { describe, expect, it } from 'vitest'
import { createTranslator } from '@/i18n/translate'
import { en } from '@/i18n/locales/en'
import {
  classifyFactoryUpserts,
  parseFactoryImportRows,
  parseIsActive,
} from '@/lib/import/factories-import'
import { parseCsv } from '@/lib/import/spreadsheet'

const t = createTranslator(en)

const HEADER = ['code', 'name', 'location', 'is_active']

describe('parseCsv', () => {
  it('parses quoted commas and strips a UTF-8 BOM', () => {
    expect(parseCsv('\uFEFF"code","name"\r\n"DMS","Damascus, Syria"')).toEqual([
      ['code', 'name'],
      ['DMS', 'Damascus, Syria'],
    ])
  })
})

describe('parseIsActive', () => {
  it('defaults blank values to true and accepts localized tokens', () => {
    expect(parseIsActive('')).toBe(true)
    expect(parseIsActive('TRUE')).toBe(true)
    expect(parseIsActive('نعم')).toBe(true)
    expect(parseIsActive('0')).toBe(false)
    expect(parseIsActive('غير نشط')).toBe(false)
    expect(parseIsActive('maybe')).toBeUndefined()
  })
})

describe('parseFactoryImportRows', () => {
  it('rejects a missing or extra header column', () => {
    expect(parseFactoryImportRows([['code', 'name', 'location']], t).ok).toBe(
      false,
    )
    expect(
      parseFactoryImportRows(
        [['code', 'name', 'location', 'is_active', 'id']],
        t,
      ).ok,
    ).toBe(false)
  })

  it('rejects a header that does not match the factories table', () => {
    const result = parseFactoryImportRows(
      [
        ['factory_code', 'name', 'location', 'is_active'],
        ['DMS', 'Damascus', 'Syria', 'TRUE'],
      ],
      t,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors[0]?.message).toBe(
        t('factories.import.headerMismatch'),
      )
    }
  })

  it('parses a valid row and classifies insert vs update by code', () => {
    const result = parseFactoryImportRows(
      [
        ['location', 'CODE', 'is_active', 'name'],
        ['Damascus, Syria', 'dms', 'yes', 'Damascus plant'],
        ['', 'ALP', '', 'Aleppo complex'],
      ],
      t,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.payloads).toEqual([
      {
        name: 'Damascus plant',
        code: 'DMS',
        location: 'Damascus, Syria',
        is_active: true,
      },
      {
        name: 'Aleppo complex',
        code: 'ALP',
        location: null,
        is_active: true,
      },
    ])

    const classified = classifyFactoryUpserts(result.payloads, ['DMS'])
    expect(classified.toUpdate.map((row) => row.code)).toEqual(['DMS'])
    expect(classified.toInsert.map((row) => row.code)).toEqual(['ALP'])
  })

  it('rejects duplicate codes in the file without writing a partial set', () => {
    const result = parseFactoryImportRows(
      [HEADER, ['DMS', 'Damascus', '', 'TRUE'], ['DMS', 'Other', '', 'FALSE']],
      t,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.some((error) => error.row === 3)).toBe(true)
      expect(result.errors[0]?.message).toContain('DMS')
    }
  })

  it('rejects an invalid is_active value', () => {
    const result = parseFactoryImportRows(
      [HEADER, ['DMS', 'Damascus', '', 'active-ish']],
      t,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors[0]).toEqual({
        row: 2,
        message: t('factories.import.invalidActive'),
      })
    }
  })

  it('skips empty data rows and rejects a header-only file', () => {
    expect(parseFactoryImportRows([HEADER, ['', '', '', '']], t).ok).toBe(false)

    const result = parseFactoryImportRows(
      [HEADER, ['', '', ''], ['HMS', 'Homs', 'Homs', 'FALSE']],
      t,
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.payloads).toHaveLength(1)
      expect(result.payloads[0]?.is_active).toBe(false)
    }
  })

  it('rejects files that exceed the row cap', () => {
    const result = parseFactoryImportRows(
      [HEADER, ['AA', 'Alpha', '', 'TRUE'], ['BB', 'Beta', '', 'TRUE']],
      t,
      { maxRows: 1 },
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors[0]?.message).toBe(
        t('factories.import.tooManyRows', { max: 1 }),
      )
    }
  })
})
