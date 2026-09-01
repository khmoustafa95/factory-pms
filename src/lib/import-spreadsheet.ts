import { parseDateOnly } from '@/lib/date-only'

export const MAX_IMPORT_ROWS = 100

export const PROJECT_IMPORT_FIELD_KEYS = [
  'code',
  'title',
  'description',
  'budget',
  'currency',
  'proposed_start_date',
  'proposed_end_date',
  'assigned_pm_email',
] as const

export type ProjectImportFieldKey = (typeof PROJECT_IMPORT_FIELD_KEYS)[number]

export type CsvTable = {
  headers: string[]
  rows: string[][]
}

export function parseCsv(text: string): CsvTable {
  const source = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const rows: string[][] = []
  let current: string[] = []
  let cell = ''
  let inQuotes = false

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    const next = source[index + 1]

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"'
        index += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        cell += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
      continue
    }

    if (char === ',') {
      current.push(cell)
      cell = ''
      continue
    }

    if (char === '\n') {
      current.push(cell)
      rows.push(current)
      current = []
      cell = ''
      continue
    }

    cell += char
  }

  if (inQuotes) {
    throw new Error('Unterminated quoted field')
  }

  if (cell.length > 0 || current.length > 0) {
    current.push(cell)
    rows.push(current)
  }

  const [headerRow, ...dataRows] = rows.filter(
    (row) => row.some((value) => value.trim() !== ''),
  )

  if (!headerRow || headerRow.length === 0) {
    return { headers: [], rows: [] }
  }

  const headers = headerRow.map((header) => header.trim())
  const normalizedRows = dataRows.map((row) => {
    const padded = [...row]
    while (padded.length < headers.length) {
      padded.push('')
    }
    return padded.slice(0, headers.length).map((value) => value.trim())
  })

  return { headers, rows: normalizedRows }
}

export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replaceAll(/\s+/g, '_')
}

export function autoMapColumns(
  headers: string[],
  targets: string[],
): Record<string, string> {
  const mapping: Record<string, string> = {}
  const unused = new Set(headers)

  for (const target of targets) {
    const normalizedTarget = normalizeHeader(target)
    const match = [...unused].find(
      (header) =>
        normalizeHeader(header) === normalizedTarget ||
        normalizeHeader(header) === normalizeHeader(target.replaceAll('_', ' ')),
    )
    if (match) {
      mapping[target] = match
      unused.delete(match)
    }
  }

  return mapping
}

export function rowToRecord(
  headers: string[],
  row: string[],
): Record<string, string> {
  const record: Record<string, string> = {}
  for (let index = 0; index < headers.length; index += 1) {
    record[headers[index]] = row[index] ?? ''
  }
  return record
}

export function mappedRecord(
  record: Record<string, string>,
  mapping: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [target, header] of Object.entries(mapping)) {
    if (!header) {
      continue
    }
    result[target] = record[header] ?? ''
  }
  return result
}

export function parseImportDate(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  if (parseDateOnly(trimmed)) {
    return trimmed
  }
  const slash = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(trimmed)
  if (slash) {
    const day = slash[1].padStart(2, '0')
    const month = slash[2].padStart(2, '0')
    const year = slash[3]
    const iso = `${year}-${month}-${day}`
    return parseDateOnly(iso) ? iso : null
  }
  return null
}

export function parseImportBudget(value: string): string {
  return value.replaceAll(',', '').trim()
}
