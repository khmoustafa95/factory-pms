import type { CellValue, Workbook } from 'exceljs'

export type SpreadsheetKind = 'xlsx' | 'csv'

export type SpreadsheetParseReason = 'unsupported' | 'unreadable' | 'empty'

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export class SpreadsheetParseError extends Error {
  readonly reason: SpreadsheetParseReason

  constructor(reason: SpreadsheetParseReason, message?: string) {
    super(message ?? reason)
    this.name = 'SpreadsheetParseError'
    this.reason = reason
  }
}

type ExcelJSModule = typeof import('exceljs')

async function loadExcelJS(): Promise<ExcelJSModule> {
  const mod = await import('exceljs')
  if (typeof mod.Workbook === 'function') {
    return mod
  }

  const nested = (mod as { default?: ExcelJSModule }).default
  if (nested && typeof nested.Workbook === 'function') {
    return nested
  }

  throw new SpreadsheetParseError('unreadable')
}

export function getSpreadsheetKind(
  file: File,
): SpreadsheetKind | 'unsupported' {
  const name = file.name.toLowerCase()
  if (name.endsWith('.xlsx')) {
    return 'xlsx'
  }
  if (name.endsWith('.csv')) {
    return 'csv'
  }

  const mime = file.type.toLowerCase()
  if (mime === XLSX_MIME) {
    return 'xlsx'
  }
  if (mime === 'text/csv' || mime === 'application/csv') {
    return 'csv'
  }

  return 'unsupported'
}

export function parseCsv(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, '')
  if (input.length === 0) {
    return []
  }

  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]
    const next = input[index + 1]

    if (inQuotes) {
      if (char === '"') {
        if (next === '"') {
          cell += '"'
          index += 1
        } else {
          inQuotes = false
        }
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
      row.push(cell)
      cell = ''
      continue
    }

    if (char === '\n' || (char === '\r' && next !== '\n')) {
      row.push(cell)
      cell = ''
      rows.push(row)
      row = []
      continue
    }

    if (char === '\r') {
      continue
    }

    cell += char
  }

  row.push(cell)
  rows.push(row)
  return rows
}

function cellToString(value: CellValue): string {
  if (value == null) {
    return ''
  }

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === 'object') {
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('')
    }
    if ('text' in value && typeof value.text === 'string') {
      return value.text
    }
    if ('result' in value) {
      return cellToString(value.result)
    }
  }

  return ''
}

function pickDataSheet(workbook: Workbook) {
  const factories = workbook.worksheets.find(
    (sheet) => sheet.name.trim().toLowerCase() === 'factories',
  )
  if (factories) {
    return factories
  }

  return workbook.worksheets.find(
    (sheet) => sheet.name.trim().toLowerCase() !== 'instructions',
  )
}

export async function parseXlsx(buffer: ArrayBuffer): Promise<string[][]> {
  try {
    const ExcelJS = await loadExcelJS()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = pickDataSheet(workbook)
    if (!sheet) {
      return []
    }

    const rowCount = sheet.actualRowCount
    const columnCount = sheet.actualColumnCount
    if (rowCount === 0 || columnCount === 0) {
      return []
    }

    const grid: string[][] = []
    for (let rowNumber = 1; rowNumber <= rowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber)
      const cells: string[] = []
      for (let column = 1; column <= columnCount; column += 1) {
        cells.push(cellToString(row.getCell(column).value))
      }
      grid.push(cells)
    }

    return grid
  } catch (error) {
    if (error instanceof SpreadsheetParseError) {
      throw error
    }
    throw new SpreadsheetParseError('unreadable')
  }
}

export async function parseSpreadsheetFile(file: File): Promise<string[][]> {
  const kind = getSpreadsheetKind(file)
  if (kind === 'unsupported') {
    throw new SpreadsheetParseError('unsupported')
  }

  try {
    if (kind === 'csv') {
      const grid = parseCsv(await file.text())
      if (grid.length === 0) {
        throw new SpreadsheetParseError('empty')
      }
      return grid
    }

    const grid = await parseXlsx(await file.arrayBuffer())
    if (grid.length === 0) {
      throw new SpreadsheetParseError('empty')
    }
    return grid
  } catch (error) {
    if (error instanceof SpreadsheetParseError) {
      throw error
    }
    throw new SpreadsheetParseError('unreadable')
  }
}

function downloadBlob(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export type SpreadsheetTemplateCopy = {
  instructionsTitle: string
  instructionLines: string[]
}

export async function buildXlsxTemplateBuffer(
  sheetName: string,
  headers: readonly string[],
  copy: SpreadsheetTemplateCopy,
  options?: { rightToLeft?: boolean },
): Promise<ArrayBuffer> {
  const ExcelJS = await loadExcelJS()
  const workbook = new ExcelJS.Workbook()
  const dataSheet = workbook.addWorksheet(sheetName, {
    views: [
      {
        rightToLeft: Boolean(options?.rightToLeft),
        state: 'frozen',
        ySplit: 1,
      },
    ],
  })

  dataSheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: Math.max(14, header.length + 8),
  }))
  dataSheet.getRow(1).font = { bold: true }

  const instructions = workbook.addWorksheet(
    copy.instructionsTitle.slice(0, 31) || 'instructions',
  )
  instructions.views = [{ rightToLeft: Boolean(options?.rightToLeft) }]
  instructions.getColumn(1).width = 80
  instructions.addRow([copy.instructionsTitle]).font = { bold: true }
  for (const line of copy.instructionLines) {
    instructions.addRow([line])
  }

  const data = await workbook.xlsx.writeBuffer()
  if (data instanceof ArrayBuffer) {
    return data
  }
  if (ArrayBuffer.isView(data)) {
    return Uint8Array.from(data).buffer
  }
  throw new SpreadsheetParseError('unreadable')
}

export async function downloadXlsxTemplate(
  fileName: string,
  sheetName: string,
  headers: readonly string[],
  copy: SpreadsheetTemplateCopy,
  options?: { rightToLeft?: boolean },
) {
  const buffer = await buildXlsxTemplateBuffer(
    sheetName,
    headers,
    copy,
    options,
  )
  const blob = new Blob([buffer], { type: XLSX_MIME })
  downloadBlob(fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`, blob)
}
