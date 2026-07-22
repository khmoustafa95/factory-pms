import { describe, expect, it } from 'vitest'
import { joinMappers, mapJoinRow, mapJoinRows } from '@/lib/supabase-joins'

describe('supabase join helpers', () => {
  it('maps join rows and handles empty input', () => {
    expect(mapJoinRows<{ id: string }>(null)).toEqual([])
    expect(mapJoinRows([{ id: '1' }])).toEqual([{ id: '1' }])
  })

  it('maps a single join row and handles empty input', () => {
    expect(mapJoinRow<{ id: string }>(null)).toBeNull()
    expect(mapJoinRow({ id: '1' })).toEqual({ id: '1' })
  })

  it('exposes typed join mappers', () => {
    expect(joinMappers.projectListItem([{ id: 'p1' }])).toEqual([{ id: 'p1' }])
    expect(joinMappers.projectDetail({ id: 'p1' })).toEqual({ id: 'p1' })
  })
})
