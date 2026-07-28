import type { ProjectScheduleInput } from '@/lib/duration'
import {
  formatDurationLabel,
  getProjectDurationDays,
  getProjectScheduleBounds,
} from '@/lib/duration'
import { formatLocalizedDate } from '@/lib/i18n-format'
import type { Locale } from '@/i18n/types'
import type { DurationUnit } from '@/types/database'

type TranslateFn = (
  key: string,
  params?: Record<string, string | number>,
) => string

export function formatProjectSchedule(
  project: ProjectScheduleInput,
  locale: Locale,
  t: TranslateFn,
  fallback = '—',
): string {
  const bounds = getProjectScheduleBounds(project)

  if (bounds.start && bounds.end) {
    return `${formatLocalizedDate(bounds.start, locale, fallback)} → ${formatLocalizedDate(bounds.end, locale, fallback)}`
  }

  if (
    project.proposed_duration_value != null &&
    project.proposed_duration_unit
  ) {
    return formatDurationLabel(
      t,
      project.proposed_duration_value,
      project.proposed_duration_unit,
    )
  }

  return fallback
}

export function getDefaultDurationFromProject(project: ProjectScheduleInput): {
  value: number
  unit: DurationUnit
} {
  if (
    project.proposed_duration_value != null &&
    project.proposed_duration_unit
  ) {
    return {
      value: project.proposed_duration_value,
      unit: project.proposed_duration_unit,
    }
  }

  const days = getProjectDurationDays(project)
  if (days != null) {
    if (days % 30 === 0) {
      return { value: days / 30, unit: 'month' }
    }
    if (days % 7 === 0) {
      return { value: days / 7, unit: 'week' }
    }
    return { value: days, unit: 'day' }
  }

  return { value: 12, unit: 'week' }
}
