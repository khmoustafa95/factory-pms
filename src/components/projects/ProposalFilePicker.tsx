import { Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { FileDropzone } from '@/components/files/FileDropzone'
import { FileTypeIcon } from '@/components/files/FileTypeIcon'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useTranslation } from '@/contexts/LocaleContext'
import {
  ATTACHMENT_ACCEPT,
  isAllowedAttachment,
} from '@/hooks/useProjectAttachments'

interface ProposalFilePickerProps {
  files: File[]
  onChange: (files: File[]) => void
  disabled?: boolean
}

export function ProposalFilePicker({
  files,
  onChange,
  disabled = false,
}: ProposalFilePickerProps) {
  const { t } = useTranslation()

  const addFiles = (selected: File[]) => {
    if (selected.length === 0) {
      return
    }

    const invalid = selected.find((file) => !isAllowedAttachment(file))
    if (invalid) {
      toast.error(t('projects.attachments.invalidFile'))
      return
    }

    onChange([...files, ...selected])
  }

  const removeAt = (index: number) => {
    onChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <Label>{t('projects.attachments.title')}</Label>
      <p className="text-sm text-muted-foreground">
        {t('projects.attachments.formHint')}
      </p>
      <FileDropzone
        disabled={disabled}
        accept={ATTACHMENT_ACCEPT}
        onFiles={addFiles}
        idleLabel={t('projects.attachments.dropHint')}
        activeLabel={t('projects.attachments.dropActive')}
      />
      {files.length > 0 ? (
        <ul className="space-y-1.5">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <FileTypeIcon nameOrType={file.type || file.name} />
                <span className="truncate">{file.name}</span>
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                disabled={disabled}
                onClick={() => removeAt(index)}
              >
                <X className="size-3.5" />
                <span className="sr-only">{t('common.remove')}</span>
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {files.length > 0 ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-muted-foreground"
          disabled={disabled}
          onClick={() => onChange([])}
        >
          <Trash2 className="size-3.5" />
          {t('projects.attachments.clearPending')}
        </Button>
      ) : null}
    </div>
  )
}
