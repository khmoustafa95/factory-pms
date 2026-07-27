import { Download, FileText, Paperclip, Trash2, Upload } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import { QueryState } from '@/components/QueryState'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/contexts/LocaleContext'
import {
  createSignedAttachmentUrl,
  isAllowedAttachment,
  useDeleteProjectAttachment,
  useProjectAttachments,
  useUploadProjectAttachments,
  type ProjectAttachment,
} from '@/hooks/useProjectAttachments'
import { formatLocalizedDateTime } from '@/lib/i18n-format'
import { toastMutationError } from '@/lib/mutation-error'

interface ProjectAttachmentsPanelProps {
  projectId: string
  canManage: boolean
}

function formatFileSize(bytes: number | null, fallback: string): string {
  if (bytes == null) {
    return fallback
  }

  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ProjectAttachmentsPanel({
  projectId,
  canManage,
}: ProjectAttachmentsPanelProps) {
  const { t, locale } = useTranslation()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const {
    data: attachments = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useProjectAttachments(projectId)
  const uploadAttachments = useUploadProjectAttachments(projectId)
  const deleteAttachment = useDeleteProjectAttachment(projectId)

  const handleFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''

    if (files.length === 0 || !user?.id) {
      return
    }

    const invalid = files.find((file) => !isAllowedAttachment(file))
    if (invalid) {
      toast.error(t('projects.attachments.invalidFile'))
      return
    }

    try {
      await uploadAttachments.mutateAsync({ userId: user.id, files })
      toast.success(t('projects.attachments.uploaded'))
    } catch (uploadError) {
      toastMutationError(uploadError, t('projects.attachments.uploadFailed'))
    }
  }

  const handleDownload = async (attachment: ProjectAttachment) => {
    setDownloadingId(attachment.id)
    try {
      const url = await createSignedAttachmentUrl(attachment.storage_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (downloadError) {
      toastMutationError(
        downloadError,
        t('projects.attachments.downloadFailed'),
      )
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDelete = async (attachment: ProjectAttachment) => {
    try {
      await deleteAttachment.mutateAsync(attachment)
      toast.success(t('projects.attachments.deleted'))
    } catch (deleteError) {
      toastMutationError(deleteError, t('projects.attachments.deleteFailed'))
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="size-4" />
            {t('projects.attachments.title')}
          </CardTitle>
          <CardDescription>
            {t('projects.attachments.description')}
          </CardDescription>
        </div>
        {canManage ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.xls,.xlsx,.doc,.docx,.txt"
              onChange={(event) => void handleFilesSelected(event)}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={uploadAttachments.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" />
              {uploadAttachments.isPending
                ? t('common.saving')
                : t('projects.attachments.upload')}
            </Button>
          </>
        ) : null}
      </CardHeader>
      <CardContent>
        <QueryState
          isLoading={isLoading}
          error={error}
          loadingMessage={t('common.loading')}
          errorMessage={t('projects.attachments.loadFailed')}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        >
          {attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('projects.attachments.empty')}
            </p>
          ) : (
            <ul className="space-y-2">
              {attachments.map((attachment) => (
                <li
                  key={attachment.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                >
                  <div className="flex min-w-0 items-start gap-2">
                    <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {attachment.file_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(
                          attachment.file_size_bytes,
                          t('common.notAvailable'),
                        )}
                        {' · '}
                        {formatLocalizedDateTime(attachment.created_at, locale)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={downloadingId === attachment.id}
                      onClick={() => void handleDownload(attachment)}
                    >
                      <Download className="size-4" />
                      <span className="sr-only">
                        {t('projects.attachments.download')}
                      </span>
                    </Button>
                    {canManage ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={deleteAttachment.isPending}
                        onClick={() => void handleDelete(attachment)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                        <span className="sr-only">
                          {t('projects.attachments.delete')}
                        </span>
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </QueryState>
      </CardContent>
    </Card>
  )
}
