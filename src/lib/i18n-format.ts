import { format } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import type { Locale } from '@/i18n/types'
import type {
  PhaseStatus,
  ProjectStatus,
  TaskStatus,
  UserRole,
} from '@/types/database'

type TranslateFn = (key: string) => string

export function formatFactoryLabel(factory: {
  name: string
  code: string
}): string {
  return `${factory.name} (${factory.code})`
}

const DATE_LOCALES = {
  en: enUS,
  ar,
} as const

export function formatLocalizedDate(
  value: string | null,
  locale: Locale,
  fallback = '—',
): string {
  if (!value) {
    return fallback
  }

  return format(new Date(`${value}T00:00:00`), 'dd MMM yyyy', {
    locale: DATE_LOCALES[locale],
  })
}

export function formatLocalizedDateTime(value: string, locale: Locale): string {
  return format(new Date(value), 'dd MMM yyyy', {
    locale: DATE_LOCALES[locale],
  })
}

export function formatLocalizedBudget(
  budget: number | null,
  currency: string,
  locale: Locale,
  fallback = '—',
): string {
  if (budget === null) {
    return fallback
  }

  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(budget)
}

export function getRoleLabel(t: TranslateFn, role: UserRole): string {
  return t(`roles.${role}`)
}

export function getProjectStatusLabel(
  t: TranslateFn,
  status: ProjectStatus,
): string {
  return t(`projectStatus.${status}`)
}

export function getTaskStatusLabel(t: TranslateFn, status: TaskStatus): string {
  return t(`taskStatus.${status}`)
}

export function getPhaseStatusLabel(
  t: TranslateFn,
  status: PhaseStatus,
): string {
  return t(`phaseStatus.${status}`)
}
