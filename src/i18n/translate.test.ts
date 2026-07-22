import { describe, expect, it } from 'vitest'
import { createTranslator } from '@/i18n/translate'
import { ar } from '@/i18n/locales/ar'
import { en } from '@/i18n/locales/en'

describe('createTranslator', () => {
  it('returns English strings', () => {
    const t = createTranslator(en)
    expect(t('nav.dashboard')).toBe('Dashboard')
  })

  it('returns Arabic strings', () => {
    const t = createTranslator(ar)
    expect(t('nav.dashboard')).toBe('لوحة التحكم')
  })

  it('interpolates parameters', () => {
    const t = createTranslator(en)
    expect(t('dashboard.welcome', { name: '', role: 'Director' })).toContain(
      'Director',
    )
  })

  it('falls back to key for missing paths', () => {
    const t = createTranslator(en)
    expect(t('missing.key')).toBe('missing.key')
  })
})
