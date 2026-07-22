import { describe, expect, it } from 'vitest'
import {
  buildIlikePattern,
  escapeIlikePattern,
  getPaginationRange,
  getShowingRange,
  getTotalPages,
} from '@/lib/list-query'

describe('list-query', () => {
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
