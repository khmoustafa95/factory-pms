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

/** Quote a PostgREST filter value so commas/`()` in search text cannot break `.or()`. */
export function quotePostgrestFilterValue(value: string): string {
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
}

export function buildIlikeClause(column: string, pattern: string): string {
  return `${column}.ilike.${quotePostgrestFilterValue(pattern)}`
}

export function buildSearchOr(
  columns: string[],
  pattern: string,
  related?: { column: string; ids: string[] },
): string {
  const clauses = columns.map((column) => buildIlikeClause(column, pattern))

  if (related && related.ids.length > 0) {
    clauses.push(`${related.column}.in.(${related.ids.join(',')})`)
  }

  return clauses.join(',')
}

/**
 * Project list search OR-filter. PostgREST cannot parse `factories.column`
 * inside `or()`, so factory matches are applied via `factory_id`.
 */
export function buildProjectsSearchOr(
  pattern: string,
  matchingFactoryIds: string[],
): string {
  return buildSearchOr(['title', 'description', 'code'], pattern, {
    column: 'factory_id',
    ids: matchingFactoryIds,
  })
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

type RangeQueryResult = {
  data: unknown
  error: Error | null
  count: number | null
}

type RangeQueryable = {
  range: (from: number, to: number) => PromiseLike<RangeQueryResult>
}

export async function fetchPaginatedList<T>({
  page,
  pageSize,
  query,
  mapItems,
}: {
  page: number
  pageSize: number
  query: RangeQueryable
  mapItems?: (data: unknown) => T[]
}): Promise<PaginatedResult<T>> {
  const { from, to } = getPaginationRange(page, pageSize)
  const { data, error, count } = await query.range(from, to)

  if (error) {
    throw error
  }

  const items = mapItems ? mapItems(data) : ((data ?? []) as T[])

  return {
    items,
    total: count ?? 0,
    page,
    pageSize,
  }
}
