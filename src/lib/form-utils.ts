export const NULL_SELECT_VALUE = 'none' as const

export function formatNullableSelectValue(
  value: string | null | undefined,
): string {
  return value ?? NULL_SELECT_VALUE
}

export function parseNullableSelectValue(value: string): string | null {
  return value === NULL_SELECT_VALUE ? null : value
}
