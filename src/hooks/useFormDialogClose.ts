import { useGuardedDialogClose } from '@/hooks/useGuardedDialogClose'

export function useFormDialogClose(
  isDirty: boolean,
  onOpenChange: (open: boolean) => void,
) {
  const { discardOpen, requestClose, confirmDiscard, cancelDiscard } =
    useGuardedDialogClose(isDirty)

  return {
    discardOpen,
    handleOpenChange: (nextOpen: boolean) =>
      requestClose(nextOpen, onOpenChange),
    confirmDiscard: () => confirmDiscard(onOpenChange),
    cancelDiscard,
  }
}
