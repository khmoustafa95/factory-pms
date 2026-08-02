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

  it('validates project schedule in Arabic', () => {
    const t = createTranslator(ar)
    const result = createSubmitProjectSchema(t).safeParse({
      code: 'PRJ-001',
      title: 'مشروع تجريبي',
      description: 'وصف تجريبي طويل بما فيه الكفاية',
      budget: '1000',
      currency: 'USD',
      proposed_start_date: '2024-01-10',
      proposed_end_date: '2024-01-01',
      assigned_pm_id: '123e4567-e89b-12d3-a456-426614174000',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'يجب أن يكون تاريخ الانتهاء في أو بعد تاريخ البدء',
      )
    }
  })

  it('requires a valid project code, description, budget, and PM on submit', () => {
    const t = createTranslator(en)
    const result = createSubmitProjectSchema(t).safeParse({
      code: 'x',
      title: 'A valid title',
      description: 'hi',
      budget: '',
      currency: 'USD',
      proposed_start_date: '2024-01-01',
      proposed_end_date: '2024-01-10',
      assigned_pm_id: '',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message)
      expect(messages).toContain('Code must be at least 2 characters')
      expect(messages).toContain('Description must be at least 3 characters')
      expect(messages).toContain('Budget is required')
      expect(messages).toContain('Assigned project manager is required')
    }
  })
})
