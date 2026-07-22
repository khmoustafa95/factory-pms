import { describe, expect, it, vi } from 'vitest'
import {
  buildIlikePattern,
  escapeIlikePattern,
  fetchPaginatedList,
  getPaginationRange,
  getShowingRange,
  getTotalPages,
} from '@/lib/list-query'

describe('fetchPaginatedList', () => {
  it('maps items and returns pagination metadata', async () => {
    const range = vi.fn().mockResolvedValue({
      data: [{ id: '1' }, { id: '2' }],
      error: null,
      count: 12,
    })

    const result = await fetchPaginatedList({
      page: 2,
      pageSize: 10,
      query: { range },
      mapItems: (data) => data as Array<{ id: string }>,
    })

    const { from, to } = getPaginationRange(2, 10)
    expect(range).toHaveBeenCalledWith(from, to)
    expect(result).toEqual({
      items: [{ id: '1' }, { id: '2' }],
      total: 12,
      page: 2,
      pageSize: 10,
    })
  })

  it('throws when the query fails', async () => {
    const range = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('query failed'),
      count: null,
    })

    await expect(
      fetchPaginatedList({
        page: 1,
        pageSize: 10,
        query: { range },
      }),
    ).rejects.toThrow('query failed')
  })
})

describe('list-query helpers', () => {
  it('escapes ilike wildcards', () => {
    expect(escapeIlikePattern('100%_done')).toBe('100\\%\\_done')
  })

  it('builds ilike patterns from trimmed search text', () => {
    expect(buildIlikePattern('  alpha  ')).toBe('%alpha%')
    expect(buildIlikePattern('   ')).toBeNull()
  })

  it('calculates pagination ranges', () => {
    expect(getPaginationRange(1, 10)).toEqual({ from: 0, to: 9 })
    expect(getPaginationRange(3, 25)).toEqual({ from: 50, to: 74 })
  })

  it('calculates total pages and showing range', () => {
    expect(getTotalPages(0, 10)).toBe(1)
    expect(getTotalPages(21, 10)).toBe(3)
    expect(getShowingRange(2, 10, 21)).toEqual({ from: 11, to: 20 })
    expect(getShowingRange(1, 10, 0)).toEqual({ from: 0, to: 0 })
  })
})
