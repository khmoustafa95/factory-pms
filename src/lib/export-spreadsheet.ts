export type SpreadsheetColumn<T> = {
  header: string
  value: (row: T) => string | number | boolean | null | undefined
}

export function escapeCsvCell(
  value: string | number | boolean | null | undefined,
): string {
  if (value == null) {
    return ''
  }

  const text = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)

  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`
  }

  return text
}

export function buildCsv<T>(columns: SpreadsheetColumn<T>[], rows: T[]): string {
  const header = columns.map((column) => escapeCsvCell(column.header)).join(',')
  const body = rows.map((row) =>
    columns.map((column) => escapeCsvCell(column.value(row))).join(','),
  )

  return `\uFEFF${[header, ...body].join('\r\n')}`
}

export function downloadSpreadsheet<T>(
  fileName: string,
  columns: SpreadsheetColumn<T>[],
  rows: T[],
) {
  const csv = buildCsv(columns, rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
