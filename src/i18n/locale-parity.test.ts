import { describe, expect, it } from 'vitest'
import { ar } from '@/i18n/locales/ar'
import { en } from '@/i18n/locales/en'

function collectLeafPaths(
  value: unknown,
  prefix = '',
  paths: string[] = [],
): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    if (prefix) {
      paths.push(prefix)
    }
    return paths
  }

  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length === 0) {
    if (prefix) {
      paths.push(prefix)
    }
    return paths
  }

  for (const [key, child] of entries) {
    const next = prefix ? `${prefix}.${key}` : key
    collectLeafPaths(child, next, paths)
  }

  return paths
}

describe('locale key parity', () => {
  it('en and ar expose the same leaf key paths', () => {
    const enPaths = collectLeafPaths(en).sort()
    const arPaths = collectLeafPaths(ar).sort()

    const missingInAr = enPaths.filter((path) => !arPaths.includes(path))
    const missingInEn = arPaths.filter((path) => !enPaths.includes(path))

    expect({ missingInAr, missingInEn }).toEqual({
      missingInAr: [],
      missingInEn: [],
    })
  })
})
