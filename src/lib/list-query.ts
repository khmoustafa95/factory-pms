export const DEFAULT_PAGE_SIZE = 10

export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const

export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number]

export type PaginatedResult<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export function getPaginationRange(page: number, pageSize: number) {
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  return { from, to }
}

export function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&')
}

export function buildIlikePattern(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  return `%${escapeIlikePattern(trimmed)}%`
}

export function getTotalPages(total: number, pageSize: number): number {
  if (total === 0) {
    return 1
  }

  return Math.ceil(total / pageSize)
}

export function getShowingRange(
  page: number,
  pageSize: number,
  total: number,
): { from: number; to: number } {
  if (total === 0) {
    return { from: 0, to: 0 }
  }

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  return { from, to }
}
