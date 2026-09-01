import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  parseProjectDetailTab,
  type ProjectDetailTab,
} from '@/lib/notification-navigation'

export function useProjectDetailTab(showFinance: boolean) {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = parseProjectDetailTab(searchParams.get('tab'), showFinance)

  const setTab = useCallback(
    (nextTab: ProjectDetailTab) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current)
          if (nextTab === 'overview') {
            params.delete('tab')
          } else {
            params.set('tab', nextTab)
          }
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  return [tab, setTab] as const
}

export function useSettingsTab(
  allowedTabs: Array<'account' | 'general' | 'currencies'>,
) {
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams.get('tab')
  const tab =
    raw && allowedTabs.includes(raw as (typeof allowedTabs)[number])
      ? (raw as (typeof allowedTabs)[number])
      : 'account'

  const setTab = useCallback(
    (nextTab: (typeof allowedTabs)[number]) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current)
          if (nextTab === 'account') {
            params.delete('tab')
          } else {
            params.set('tab', nextTab)
          }
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  return [tab, setTab] as const
}
