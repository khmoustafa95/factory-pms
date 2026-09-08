import { parseDateOnly } from '@/lib/date-only'
import {
  downloadXlsxTemplate,
  type SpreadsheetTemplateCopy,
} from '@/lib/import/spreadsheet'
import type { ProjectPriority } from '@/types/database'
import type { ValidationTranslator } from '@/lib/validations/types'

export const PROJECT_IMPORT_COLUMNS = [
  'factory_code',
  'code',
  'title',
  'description',
  'budget',
  'currency',
  'proposed_duration_months',
  'announcement_date',
  'announcing_entity',
  'priority',
  'research_opinion',
  'board_opinion',
] as const

export const PROJECT_IMPORT_MAX_ROWS = 500

export type ProjectWritePayload = {
  factory_id: string
  code: string
  title: string
  description: string | null
  budget: number | null
  currency: string
  proposed_duration_value: number | null
  proposed_duration_unit: 'month' | null
  announcement_date: string | null
  announcing_entity: string | null
  priority: ProjectPriority | null
  research_opinion: string | null
  board_opinion: string | null
}

export type ProjectImportFactory = {
  id: string
  code: string
}

export type ProjectUpsertKey = {
  factory_id: string
  code: string
}

export type ProjectImportError = {
  row?: number
  message: string
}

export type ProjectImportParseResult =
  | { ok: true; payloads: ProjectWritePayload[] }
  | { ok: false; errors: ProjectImportError[] }

const EXPECTED_HEADERS = new Set<string>(PROJECT_IMPORT_COLUMNS)

const PRIORITY_TOKENS: Record<string, ProjectPriority> = {
  high: 'high',
  medium: 'medium',
  low: 'low',
  عالية: 'high',
  متوسطة: 'medium',
  منخفضة: 'low',
}

const FACTORY_CODE_RE = /^[A-Z0-9_-]+$/
const PROJECT_CODE_RE = /^[A-Z0-9_-]+$/

export function parseProjectPriority(
  value: string,
): ProjectPriority | null | undefined {
  const normalized = value.trim()
  if (normalized.length === 0) {
    return null
  }

  const mapped =
    PRIORITY_TOKENS[normalized.toLowerCase()] ?? PRIORITY_TOKENS[normalized]
  return mapped
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
  if (headers.length !== PROJECT_IMPORT_COLUMNS.length) {
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

function optionalText(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function parseOptionalDate(
  value: string,
  t: ValidationTranslator,
): { ok: true; value: string | null } | { ok: false; message: string } {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return { ok: true, value: null }
  }

  if (!parseDateOnly(trimmed)) {
    return { ok: false, message: t('validation.invalidDate') }
  }

  return { ok: true, value: trimmed }
}

export function parseProjectImportRows(
  grid: string[][],
  t: ValidationTranslator,
  options: {
    factories: Iterable<ProjectImportFactory>
    maxRows?: number
  },
): ProjectImportParseResult {
  const maxRows = options.maxRows ?? PROJECT_IMPORT_MAX_ROWS
  const factoriesByCode = new Map(
    [...options.factories].map((factory) => [
      factory.code.trim().toUpperCase(),
      factory.id,
    ]),
  )
  const filled = grid
    .map((row) => trimTrailingEmpty(row))
    .filter((row, index) => index === 0 || !isEmptyRow(row))

  if (filled.length === 0 || isEmptyRow(filled[0] ?? [])) {
    return { ok: false, errors: [{ message: t('projects.import.emptyFile') }] }
  }

  const indexes = headerIndexMap(filled[0] ?? [])
  if (!indexes) {
    return {
      ok: false,
      errors: [{ message: t('projects.import.headerMismatch') }],
    }
  }

  const dataRows = filled.slice(1)
  if (dataRows.length === 0) {
    return {
      ok: false,
      errors: [{ message: t('projects.import.noDataRows') }],
    }
  }

  if (dataRows.length > maxRows) {
    return {
      ok: false,
      errors: [
        { message: t('projects.import.tooManyRows', { max: maxRows }) },
      ],
    }
  }

  const errors: ProjectImportError[] = []
  const payloads: ProjectWritePayload[] = []
  const pairs = new Map<string, number>()

  for (const [offset, row] of dataRows.entries()) {
    const spreadsheetRow = offset + 2
    const extraCells = row.slice(PROJECT_IMPORT_COLUMNS.length)
    if (extraCells.some((cell) => cell.trim() !== '')) {
      errors.push({
        row: spreadsheetRow,
        message: t('projects.import.headerMismatch'),
      })
      continue
    }

    const factoryCode = cellAt(row, indexes, 'factory_code')
      .trim()
      .toUpperCase()
    const code = cellAt(row, indexes, 'code').trim().toUpperCase()
    const title = cellAt(row, indexes, 'title').trim()
    const description = optionalText(cellAt(row, indexes, 'description'))
    const budgetRaw = cellAt(row, indexes, 'budget').trim()
    const currencyRaw = cellAt(row, indexes, 'currency').trim().toUpperCase()
    const announcingEntity = optionalText(
      cellAt(row, indexes, 'announcing_entity'),
    )
    const researchOpinion = optionalText(
      cellAt(row, indexes, 'research_opinion'),
    )
    const boardOpinion = optionalText(cellAt(row, indexes, 'board_opinion'))
    const priorityValue = parseProjectPriority(
      cellAt(row, indexes, 'priority'),
    )

    const factoryCodeValid =
      factoryCode.length >= 2 &&
      factoryCode.length <= 12 &&
      FACTORY_CODE_RE.test(factoryCode)

    if (factoryCode.length < 2) {
      errors.push({
        row: spreadsheetRow,
        message: t('validation.codeMin'),
      })
    } else if (factoryCode.length > 12) {
      errors.push({
        row: spreadsheetRow,
        message: t('validation.codeMax'),
      })
    } else if (!FACTORY_CODE_RE.test(factoryCode)) {
      errors.push({
        row: spreadsheetRow,
        message: t('validation.codeFormat'),
      })
    }

    if (code.length < 2) {
      errors.push({
        row: spreadsheetRow,
        message: t('validation.codeMin'),
      })
    } else if (code.length > 32) {
      errors.push({
        row: spreadsheetRow,
        message: t('validation.projectCodeMax'),
      })
    } else if (!PROJECT_CODE_RE.test(code)) {
      errors.push({
        row: spreadsheetRow,
        message: t('validation.codeFormat'),
      })
    }

    if (title.length < 3) {
      errors.push({
        row: spreadsheetRow,
        message: t('validation.titleMin'),
      })
    }

    let budget: number | null = null
    if (budgetRaw.length > 0) {
      const parsedBudget = Number(budgetRaw)
      if (Number.isNaN(parsedBudget) || parsedBudget <= 0) {
        errors.push({
          row: spreadsheetRow,
          message: t('validation.budgetPositive'),
        })
      } else {
        budget = parsedBudget
      }
    }

    let currency = 'USD'
    if (currencyRaw.length > 0) {
      if (currencyRaw.length !== 3) {
        errors.push({
          row: spreadsheetRow,
          message: t('validation.codeFormat'),
        })
      } else {
        currency = currencyRaw
      }
    }

    if (priorityValue === undefined) {
      errors.push({
        row: spreadsheetRow,
        message: t('projects.import.invalidPriority'),
      })
    }

    const announcement = parseOptionalDate(
      cellAt(row, indexes, 'announcement_date'),
      t,
    )

    const durationRaw = cellAt(row, indexes, 'proposed_duration_months').trim()
    let durationMonths: number | null = null
    if (durationRaw.length > 0) {
      if (!/^\d+$/.test(durationRaw) || Number(durationRaw) < 1) {
        errors.push({
          row: spreadsheetRow,
          message: t('validation.durationMin'),
        })
      } else {
        durationMonths = Number(durationRaw)
      }
    }

    if (!announcement.ok) {
      errors.push({ row: spreadsheetRow, message: announcement.message })
    }

    const factoryId = factoryCodeValid
      ? factoriesByCode.get(factoryCode)
      : undefined
    if (factoryCodeValid && !factoryId) {
      errors.push({
        row: spreadsheetRow,
        message: t('projects.import.unknownFactory', { code: factoryCode }),
      })
    }

    const pairKey = `${factoryCode}:${code}`
    const previousRow = pairs.get(pairKey)
    if (previousRow !== undefined) {
      errors.push({
        row: spreadsheetRow,
        message: t('projects.import.duplicatePair', {
          factory: factoryCode,
          code,
        }),
      })
    } else if (factoryCode.length > 0 && code.length > 0) {
      pairs.set(pairKey, spreadsheetRow)
    }

    if (errors.some((error) => error.row === spreadsheetRow) || !factoryId) {
      continue
    }

    if (!announcement.ok || priorityValue === undefined) {
      continue
    }

    payloads.push({
      factory_id: factoryId,
      code,
      title,
      description,
      budget,
      currency,
      proposed_duration_value: durationMonths,
      proposed_duration_unit: durationMonths != null ? 'month' : null,
      announcement_date: announcement.value,
      announcing_entity: announcingEntity,
      priority: priorityValue,
      research_opinion: researchOpinion,
      board_opinion: boardOpinion,
    })
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return { ok: true, payloads }
}

export function classifyProjectUpserts(
  payloads: ProjectWritePayload[],
  existingKeys: Iterable<ProjectUpsertKey>,
) {
  const existing = new Set(
    [...existingKeys].map(
      (key) => `${key.factory_id}:${key.code.trim().toUpperCase()}`,
    ),
  )
  const toInsert: ProjectWritePayload[] = []
  const toUpdate: ProjectWritePayload[] = []

  for (const payload of payloads) {
    if (existing.has(`${payload.factory_id}:${payload.code}`)) {
      toUpdate.push(payload)
    } else {
      toInsert.push(payload)
    }
  }

  return { toInsert, toUpdate }
}

export async function downloadProjectsTemplate(
  copy: SpreadsheetTemplateCopy,
  options?: { rightToLeft?: boolean },
) {
  await downloadXlsxTemplate(
    'projects-template.xlsx',
    'projects',
    PROJECT_IMPORT_COLUMNS,
    copy,
    options,
  )
}
