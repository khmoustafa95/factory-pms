import { describe, expect, it } from 'vitest'
import { mapJoinRow, mapJoinRows } from '@/lib/supabase-joins'

describe('supabase join helpers', () => {
  it('maps join rows and handles empty input', () => {
    expect(mapJoinRows<{ id: string }>(null)).toEqual([])
    expect(mapJoinRows([{ id: '1' }])).toEqual([{ id: '1' }])
  })

  it('maps a single join row and handles empty input', () => {
    expect(mapJoinRow<{ id: string }>(null)).toBeNull()
    expect(mapJoinRow({ id: '1' })).toEqual({ id: '1' })
  })
})
