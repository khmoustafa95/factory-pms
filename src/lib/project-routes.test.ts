import { describe, expect, it } from 'vitest'
import {
  buildProjectPath,
  buildProjectPathFromCodes,
  isProjectUuid,
  parseProjectRouteParams,
  projectRouteKey,
} from '@/lib/project-routes'

describe('project-routes', () => {
  it('builds canonical paths with factory and project codes', () => {
    expect(
      buildProjectPath({
        code: 'PRJ-001',
        factories: { code: 'FAC-A' },
      }),
    ).toBe('/projects/FAC-A/PRJ-001')
  })

  it('parses canonical route params', () => {
    expect(
      parseProjectRouteParams({
        factoryCode: 'FAC-A',
        projectCode: 'PRJ-001',
      }),
    ).toEqual({
      kind: 'canonical',
      factoryCode: 'FAC-A',
      projectCode: 'PRJ-001',
    })
  })

  it('detects legacy UUID refs', () => {
    const uuid = 'b1111111-1111-4111-8111-111111111111'
    expect(isProjectUuid(uuid)).toBe(true)
    expect(
      parseProjectRouteParams({
        projectRef: uuid,
      }),
    ).toEqual({
      kind: 'legacy',
      ref: uuid,
    })
  })

  it('builds paths from raw codes', () => {
    expect(buildProjectPathFromCodes('FAC-A', 'PRJ-001')).toBe(
      '/projects/FAC-A/PRJ-001',
    )
  })

  it('serializes route keys', () => {
    expect(
      projectRouteKey({
        kind: 'canonical',
        factoryCode: 'FAC-A',
        projectCode: 'PRJ-001',
      }),
    ).toBe('FAC-A/PRJ-001')
  })
})
