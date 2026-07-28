import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import type { DurationUnit } from '@/types/database'

export const DURATION_UNIT_OPTIONS = [
  'day',
  'week',
  'month',
] as const satisfies readonly DurationUnit[]

export function durationToDays(value: number, unit: DurationUnit): number {
  switch (unit) {
    case 'day':
      return value
    case 'week':
      return value * 7
    case 'month':
      return value * 30
  }
}

export function formatDurationLabel(
  t: (key: string, params?: Record<string, string | number>) => string,
  value: number | null | undefined,
  unit: DurationUnit | null | undefined,
): string {
  if (value == null || !unit) {
    return '—'
  }

  const key =
    value === 1
      ? `durationUnit.${unit}One`
      : unit === 'day'
        ? `durationUnit.${unit}`
        : `durationUnit.${unit}Other`

  return t(key, { count: value })
}

export interface ProjectScheduleInput {
  actual_start_date: string | null
  actual_end_date: string | null
  proposed_start_date: string | null
  proposed_end_date: string | null
  proposed_duration_value: number | null
  proposed_duration_unit: DurationUnit | null
}

export interface ProjectScheduleBounds {
  start: string | null
  end: string | null
  durationDays: number | null
  hasFixedDates: boolean
}

export function getProjectDurationDays(
  project: ProjectScheduleInput,
): number | null {
  if (
    project.proposed_duration_value != null &&
    project.proposed_duration_unit
  ) {
    return durationToDays(
      project.proposed_duration_value,
      project.proposed_duration_unit,
    )
  }

  if (project.proposed_start_date && project.proposed_end_date) {
    return (
      differenceInCalendarDays(
        parseISO(project.proposed_end_date),
        parseISO(project.proposed_start_date),
      ) + 1
    )
  }

  if (project.actual_start_date && project.actual_end_date) {
    return (
      differenceInCalendarDays(
        parseISO(project.actual_end_date),
        parseISO(project.actual_start_date),
      ) + 1
    )
  }

  return null
}

export function getProjectScheduleBounds(
  project: ProjectScheduleInput,
): ProjectScheduleBounds {
  const durationDays = getProjectDurationDays(project)

  if (project.actual_start_date) {
    const end =
      project.actual_end_date ??
      (durationDays != null
        ? format(
            addDays(parseISO(project.actual_start_date), durationDays - 1),
            'yyyy-MM-dd',
          )
        : null)

    return {
      start: project.actual_start_date,
      end,
      durationDays,
      hasFixedDates: true,
    }
  }

  if (project.proposed_start_date && project.proposed_end_date) {
    return {
      start: project.proposed_start_date,
      end: project.proposed_end_date,
      durationDays,
      hasFixedDates: true,
    }
  }

  return {
    start: null,
    end: null,
    durationDays,
    hasFixedDates: false,
  }
}

export function getPhaseDurationDays(
  startDate: string,
  endDate: string,
): number {
  return differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1
}

export function inferDurationFromLegacyDates(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): { value: number; unit: DurationUnit } | null {
  if (!startDate || !endDate) {
    return null
  }

  const days =
    differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1

  if (days <= 0) {
    return null
  }

  if (days % 30 === 0) {
    return { value: days / 30, unit: 'month' }
  }

  if (days % 7 === 0) {
    return { value: days / 7, unit: 'week' }
  }

  return { value: days, unit: 'day' }
}
