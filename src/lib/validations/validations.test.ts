import { describe, expect, it } from 'vitest'
import { createTranslator } from '@/i18n/translate'
import { ar } from '@/i18n/locales/ar'
import { en } from '@/i18n/locales/en'
import { createLoginFormSchema } from '@/lib/validations/account'
import { createSubmitProjectSchema } from '@/lib/validations/project'

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

  it('requires duration months on submit', () => {
    const t = createTranslator(ar)
    const result = createSubmitProjectSchema(t).safeParse({
      code: 'PRJ-001',
      title: 'مشروع تجريبي',
      description: 'وصف تجريبي طويل بما فيه الكفاية',
      budget: '1000',
      currency: 'USD',
      proposed_duration_months: '',
      announcement_date: '',
      announcing_entity: '',
      priority: '',
      research_opinion: '',
      board_opinion: '',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'proposed_duration_months')).toBe(
        true,
      )
    }
  })

  it('requires a valid project code, description, budget, and duration on submit', () => {
    const t = createTranslator(en)
    const incomplete = createSubmitProjectSchema(t).safeParse({
      code: 'x',
      title: 'A valid title',
      description: 'hi',
      budget: '',
      currency: 'USD',
      proposed_duration_months: '',
      announcement_date: '',
      announcing_entity: '',
      priority: '',
      research_opinion: '',
      board_opinion: '',
    })

    expect(incomplete.success).toBe(false)
    if (!incomplete.success) {
      const messages = incomplete.error.issues.map((issue) => issue.message)
      expect(messages).toContain('Code must be at least 2 characters')
      expect(messages).toContain('Description must be at least 3 characters')
      expect(messages).toContain('Budget is required')
      expect(messages).toContain('Duration is required')
    }

    const complete = createSubmitProjectSchema(t).safeParse({
      code: 'PRJ-001',
      title: 'A valid title',
      description: 'A valid description',
      budget: '1000',
      currency: 'USD',
      proposed_duration_months: '6',
      announcement_date: '',
      announcing_entity: '',
      priority: '',
      research_opinion: '',
      board_opinion: '',
    })
    expect(complete.success).toBe(true)
  })
})
