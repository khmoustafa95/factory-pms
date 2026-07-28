import { describe, expect, it } from 'vitest'
import { createTranslator } from '@/i18n/translate'
import { ar } from '@/i18n/locales/ar'
import { en } from '@/i18n/locales/en'
import { createLoginFormSchema } from '@/lib/validations/account'
import { createProjectFormSchema } from '@/lib/validations/project'

describe('localized validation schemas', () => {
  it('returns English login validation messages', () => {
    const t = createTranslator(en)
    const result = createLoginFormSchema(t).safeParse({
      email: 'bad',
      password: '123',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message)
      expect(messages).toContain('Enter a valid email')
      expect(messages).toContain('Password must be at least 6 characters')
    }
  })

  it('returns Arabic login validation messages', () => {
    const t = createTranslator(ar)
    const result = createLoginFormSchema(t).safeParse({
      email: 'bad',
      password: '123',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message)
      expect(messages).toContain('أدخل بريداً إلكترونياً صالحاً')
      expect(messages).toContain('يجب أن تكون كلمة المرور 6 أحرف على الأقل')
    }
  })

  it('validates project duration in Arabic', () => {
    const t = createTranslator(ar)
    const result = createProjectFormSchema(t).safeParse({
      title: 'مشروع',
      currency: 'USD',
      assigned_pm_id: null,
      proposed_duration_value: 0,
      proposed_duration_unit: 'week',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'يجب أن تكون المدة 1 على الأقل',
      )
    }
  })
})
