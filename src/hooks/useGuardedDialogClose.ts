import { useCallback, useState } from 'react'

export function useGuardedDialogClose(isDirty: boolean) {
  const [discardOpen, setDiscardOpen] = useState(false)

  const requestClose = useCallback(
    (nextOpen: boolean, onOpenChange: (open: boolean) => void) => {
      if (!nextOpen && isDirty) {
        setDiscardOpen(true)
        return
      }
      onOpenChange(nextOpen)
    },
    [isDirty],
  )

  const confirmDiscard = useCallback(
    (onOpenChange: (open: boolean) => void) => {
      setDiscardOpen(false)
      onOpenChange(false)
    },
    [],
  )

  const cancelDiscard = useCallback(() => {
    setDiscardOpen(false)
  }, [])

  return {
    discardOpen,
    requestClose,
    confirmDiscard,
    cancelDiscard,
  }
}
