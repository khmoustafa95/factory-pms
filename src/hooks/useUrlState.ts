import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useUrlState(key: string, defaultValue = '') {
  const [searchParams, setSearchParams] = useSearchParams()

  const value = searchParams.get(key) ?? defaultValue

  const setValue = useCallback(
    (next: string | null) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current)
          if (next == null || next === '' || next === defaultValue) {
            params.delete(key)
          } else {
            params.set(key, next)
          }
          return params
        },
        { replace: true },
      )
    },
    [defaultValue, key, setSearchParams],
  )

  return [value, setValue] as const
}

export function useUrlStateMap(keys: string[]) {
  const [searchParams, setSearchParams] = useSearchParams()

  const values = useMemo(() => {
    const map: Record<string, string | null> = {}
    for (const key of keys) {
      map[key] = searchParams.get(key)
    }
    return map
  }, [keys, searchParams])

  const setParam = useCallback(
    (key: string, value: string | null) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current)
          if (value == null || value === '') {
            params.delete(key)
          } else {
            params.set(key, value)
          }
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current)
          for (const [key, value] of Object.entries(updates)) {
            if (value == null || value === '') {
              params.delete(key)
            } else {
              params.set(key, value)
            }
          }
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const clearParams = useCallback(
    (keysToClear: string[]) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current)
          for (const key of keysToClear) {
            params.delete(key)
          }
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  return { values, setParam, setParams, clearParams }
}
