import { useRef, useState, type DragEvent, type ReactNode } from 'react'
import { Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileDropzoneProps {
  onFiles: (files: File[]) => void
  disabled?: boolean
  accept?: string
  multiple?: boolean
  className?: string
  idleLabel: string
  activeLabel: string
  children?: ReactNode
}

export function FileDropzone({
  onFiles,
  disabled = false,
  accept,
  multiple = true,
  className,
  idleLabel,
  activeLabel,
  children,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isActive, setIsActive] = useState(false)

  const emitFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList)
    if (files.length === 0) {
      return
    }
    onFiles(files)
  }

  const handleDragOver = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    if (!disabled) {
      setIsActive(true)
    }
  }

  const handleDragLeave = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setIsActive(false)
  }

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setIsActive(false)
    if (disabled) {
      return
    }
    emitFiles(event.dataTransfer.files)
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center text-sm transition-colors',
          isActive
            ? 'border-primary bg-primary/5 text-foreground'
            : 'border-border text-muted-foreground hover:border-primary/60 hover:bg-muted/40',
          disabled && 'pointer-events-none opacity-50',
          className,
        )}
      >
        <Upload className="size-5" />
        <span>{isActive ? activeLabel : idleLabel}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple={multiple}
        accept={accept}
        disabled={disabled}
        onChange={(event) => {
          emitFiles(event.target.files ?? [])
          event.target.value = ''
        }}
      />
      {children}
    </div>
  )
}
