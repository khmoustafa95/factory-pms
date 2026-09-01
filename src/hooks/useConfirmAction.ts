import { useCallback, useRef, useState } from 'react'

export type ConfirmActionOptions = {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
  onConfirm: () => void | Promise<void>
}

type ConfirmState = {
  open: boolean
  isLoading: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant: 'default' | 'destructive'
}

const initialState: ConfirmState = {
  open: false,
  isLoading: false,
  title: '',
  variant: 'default',
}

export function useConfirmAction() {
  const [state, setState] = useState<ConfirmState>(initialState)
  const onConfirmRef = useRef<(() => void | Promise<void>) | null>(null)

  const confirm = useCallback((options: ConfirmActionOptions) => {
    onConfirmRef.current = options.onConfirm
    setState({
      open: true,
      isLoading: false,
      title: options.title,
      description: options.description,
      confirmLabel: options.confirmLabel,
      cancelLabel: options.cancelLabel,
      variant: options.variant ?? 'default',
    })
  }, [])

  const close = useCallback(() => {
    setState(initialState)
    onConfirmRef.current = null
  }, [])

  const handleConfirm = useCallback(async () => {
    const action = onConfirmRef.current
    if (!action) {
      return
    }

    setState((current) => ({ ...current, isLoading: true }))
    try {
      await action()
      close()
    } catch {
      setState((current) => ({ ...current, isLoading: false }))
    }
  }, [close])

  return {
    confirm,
    close,
    handleConfirm,
    state,
  }
}
