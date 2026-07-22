export function mapJoinRows<T>(data: unknown | null | undefined): T[] {
  if (!data) {
    return []
  }

  return data as T[]
}

export function mapJoinRow<T>(data: unknown | null | undefined): T | null {
  if (!data) {
    return null
  }

  return data as T
}
