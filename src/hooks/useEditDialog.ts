import { useCallback, useState } from 'react'

export function useEditDialog<T>() {
  const [open, setOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<T | null>(null)

  const openCreate = useCallback(() => {
    setEditingItem(null)
    setOpen(true)
  }, [])

  const openEdit = useCallback((item: T) => {
    setEditingItem(item)
    setOpen(true)
  }, [])

  return {
    open,
    setOpen,
    editingItem,
    openCreate,
    openEdit,
    isEditing: editingItem !== null,
  }
}
