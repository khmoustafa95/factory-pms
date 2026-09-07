import {
  downloadXlsxTemplate,
  type SpreadsheetTemplateCopy,
} from '@/lib/import/spreadsheet'
import {
  createFactoryFormSchema,
  toFactoryPayload,
} from '@/lib/validations/factory'
import type { ValidationTranslator } from '@/lib/validations/types'

export const FACTORY_IMPORT_COLUMNS = [
  'code',
  'name',
  'location',
  'is_active',
] as const

export const FACTORY_IMPORT_MAX_ROWS = 500

export type FactoryWritePayload = ReturnType<typeof toFactoryPayload>

export type FactoryImportError = {
  row?: number
  message: string
}

export type FactoryImportParseResult =
  | { ok: true; payloads: FactoryWritePayload[] }
  | { ok: false; errors: FactoryImportError[] }

const EXPECTED_HEADERS = new Set<string>(FACTORY_IMPORT_COLUMNS)

const ACTIVE_TRUE = new Set(['true', '1', 'yes', 'y', 'نعم', 'نشط'])
const ACTIVE_FALSE = new Set(['false', '0', 'no', 'n', 'لا', 'غير نشط'])

export function parseIsActive(value: string): boolean | undefined {
  const normalized = value.trim().toLowerCase()
  if (normalized.length === 0) {
    return true
  }
  if (ACTIVE_TRUE.has(normalized)) {
    return true
  }
  if (ACTIVE_FALSE.has(normalized)) {
    return false
  }
  return undefined
}

function trimTrailingEmpty(cells: string[]): string[] {
  let end = cells.length
  while (end > 0 && cells[end - 1]?.trim() === '') {
    end -= 1
  }
  return cells.slice(0, end)
}

function isEmptyRow(cells: string[]): boolean {
  return cells.every((cell) => cell.trim() === '')
}

function headerIndexMap(headers: string[]): Map<string, number> | null {
  if (headers.length !== FACTORY_IMPORT_COLUMNS.length) {
    return null
  }

  const seen = new Set<string>()
  const indexes = new Map<string, number>()

  for (const [index, raw] of headers.entries()) {
    const header = raw.trim().toLowerCase()
    if (!EXPECTED_HEADERS.has(header) || seen.has(header)) {
      return null
    }
    seen.add(header)
    indexes.set(header, index)
  }

  return seen.size === EXPECTED_HEADERS.size ? indexes : null
}

function cellAt(row: string[], indexes: Map<string, number>, column: string) {
  const index = indexes.get(column)
  return index === undefined ? '' : (row[index] ?? '')
}

export function parseFactoryImportRows(
  grid: string[][],
  t: ValidationTranslator,
  options?: { maxRows?: number },
): FactoryImportParseResult {
  const maxRows = options?.maxRows ?? FACTORY_IMPORT_MAX_ROWS
  const schema = createFactoryFormSchema(t)
  const filled = grid
    .map((row) => trimTrailingEmpty(row))
    .filter((row, index) => index === 0 || !isEmptyRow(row))

  if (filled.length === 0 || isEmptyRow(filled[0] ?? [])) {
    return { ok: false, errors: [{ message: t('factories.import.emptyFile') }] }
  }

  const indexes = headerIndexMap(filled[0] ?? [])
  if (!indexes) {
    return {
      ok: false,
      errors: [{ message: t('factories.import.headerMismatch') }],
    }
  }

  const dataRows = filled.slice(1)
  if (dataRows.length === 0) {
    return {
      ok: false,
      errors: [{ message: t('factories.import.noDataRows') }],
    }
  }

  if (dataRows.length > maxRows) {
    return {
      ok: false,
      errors: [
        { message: t('factories.import.tooManyRows', { max: maxRows }) },
      ],
    }
  }

  const errors: FactoryImportError[] = []
  const payloads: FactoryWritePayload[] = []
  const codes = new Map<string, number>()

  for (const [offset, row] of dataRows.entries()) {
    const spreadsheetRow = offset + 2
    const extraCells = row.slice(FACTORY_IMPORT_COLUMNS.length)
    if (extraCells.some((cell) => cell.trim() !== '')) {
      errors.push({
        row: spreadsheetRow,
        message: t('factories.import.headerMismatch'),
      })
      continue
    }

    const isActiveValue = parseIsActive(cellAt(row, indexes, 'is_active'))
    if (isActiveValue === undefined) {
      errors.push({
        row: spreadsheetRow,
        message: t('factories.import.invalidActive'),
      })
      continue
    }

    const parsed = schema.safeParse({
      code: cellAt(row, indexes, 'code').trim().toUpperCase(),
      name: cellAt(row, indexes, 'name'),
      location: cellAt(row, indexes, 'location'),
      is_active: isActiveValue,
    })

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push({
          row: spreadsheetRow,
          message: issue.message,
        })
      }
      continue
    }

    const payload = toFactoryPayload(parsed.data)
    const previousRow = codes.get(payload.code)
    if (previousRow !== undefined) {
      errors.push({
        row: spreadsheetRow,
        message: t('factories.import.duplicateCode', { code: payload.code }),
      })
      continue
    }

    codes.set(payload.code, spreadsheetRow)
    payloads.push(payload)
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return { ok: true, payloads }
}

export function classifyFactoryUpserts(
  payloads: FactoryWritePayload[],
  existingCodes: Iterable<string>,
) {
  const existing = new Set(
    [...existingCodes].map((code) => code.trim().toUpperCase()),
  )
  const toInsert: FactoryWritePayload[] = []
  const toUpdate: FactoryWritePayload[] = []

  for (const payload of payloads) {
    if (existing.has(payload.code)) {
      toUpdate.push(payload)
    } else {
      toInsert.push(payload)
    }
  }

  return { toInsert, toUpdate }
}

export async function downloadFactoriesTemplate(
  copy: SpreadsheetTemplateCopy,
  options?: { rightToLeft?: boolean },
) {
  await downloadXlsxTemplate(
    'factories-template.xlsx',
    'factories',
    FACTORY_IMPORT_COLUMNS,
    copy,
    options,
  )
}
