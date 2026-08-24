import { useEffect, useState } from 'react'

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)
  const immediate = typeof value === 'string' && value.trim() === ''

  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        setDebounced(value)
      },
      immediate ? 0 : delayMs,
    )

    return () => {
      window.clearTimeout(timer)
    }
  }, [delayMs, immediate, value])

  return immediate && typeof value === 'string' ? value : debounced
}
